"""Core Score Fusion Engine.

Pure function `fuse(rule, llm, url_check, ...)` with no external I/O.
Merges signals from rule-based detection, Claude LLM analysis, and Safe Browsing
URL intelligence into a consolidated final verdict, adhering strictly to the
safety rules of AGENT.md Section 5.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.core.constants import (
    CONFIDENCE_DEGRADED_PENALTY,
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_MEDIUM,
    DEFAULT_RISK_DISCLAIMER,
    FUSION_CAP_LLM_ONLY_SCORE,
    FUSION_MALICIOUS_MIN_SCORE,
    FUSION_SCORE_THRESHOLD_LIKELY_SCAM,
    FUSION_SCORE_THRESHOLD_SAFE,
    FUSION_WEIGHT_LLM,
    FUSION_WEIGHT_LLM_NO_URL,
    FUSION_WEIGHT_RULE,
    FUSION_WEIGHT_RULE_NO_LLM,
    FUSION_WEIGHT_RULE_NO_URL,
    FUSION_WEIGHT_URL,
    FUSION_WEIGHT_URL_NO_LLM,
    HIGH_RISK_DISCLAIMER,
    LLM_SCORE_LIKELY_SCAM,
    LLM_SCORE_SAFE,
    LLM_SCORE_SUSPICIOUS,
    LOWEST_RISK_DISCLAIMER,
    MAX_CONFIDENCE_CAP,
    URL_SCORE_CLEAN,
    URL_SCORE_MALICIOUS,
    URL_SCORE_SUSPICIOUS,
    VERDICT_LIKELY_SCAM,
    VERDICT_SAFE,
    VERDICT_SUSPICIOUS,
)
from app.schemas.analysis import RuleResult
from app.schemas.llm import LLMResult
from app.schemas.url_check import UrlCheckResult
from app.schemas.verdict import ActionItem, FinalVerdict, MergedRedFlag

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
ACTIONS_FILE = DATA_DIR / "actions.json"
EXPLANATIONS_FILE = DATA_DIR / "explanations.json"

_cached_actions: dict | None = None
_cached_explanations: dict | None = None


def load_actions(path: Path | None = None) -> dict:
    """Load action checklist templates from actions.json."""
    global _cached_actions
    if _cached_actions is not None and path is None:
        return _cached_actions

    target = path or ACTIONS_FILE
    with open(target, "r", encoding="utf-8") as f:
        data = json.load(f)

    if path is None:
        _cached_actions = data
    return data


def load_explanations(path: Path | None = None) -> dict:
    """Load fallback explanation templates from explanations.json."""
    global _cached_explanations
    if _cached_explanations is not None and path is None:
        return _cached_explanations

    target = path or EXPLANATIONS_FILE
    with open(target, "r", encoding="utf-8") as f:
        data = json.load(f)

    if path is None:
        _cached_explanations = data
    return data


def normalize_scam_type(raw_type: str | None) -> str:
    """Normalize human-readable or rule-guessed scam type to standardized snake_case."""
    if not raw_type:
        return "none"
    cleaned = (
        raw_type.strip().lower().replace(" ", "_").replace("-", "_").replace("/", "_")
    )
    valid_types = {
        "digital_arrest",
        "fake_kyc",
        "upi_refund",
        "job_task_scam",
        "lottery_prize",
        "electricity_bill_threat",
        "other",
        "none",
    }
    if cleaned in valid_types:
        return cleaned
    if "arrest" in cleaned:
        return "digital_arrest"
    if "kyc" in cleaned:
        return "fake_kyc"
    if "upi" in cleaned or "refund" in cleaned:
        return "upi_refund"
    if "job" in cleaned or "task" in cleaned:
        return "job_task_scam"
    if "lottery" in cleaned or "prize" in cleaned:
        return "lottery_prize"
    if "electricity" in cleaned or "bijli" in cleaned or "bill" in cleaned:
        return "electricity_bill_threat"
    return "other"


def _build_action_checklist(scam_type: str) -> list[ActionItem]:
    """Build prioritized user action items, always including 1930 and cybercrime.gov.in."""
    data = load_actions()
    actions: list[ActionItem] = []

    # 1. Type-specific actions first
    by_type = data.get("by_type", {})
    type_actions = by_type.get(scam_type) or by_type.get("other", [])
    for item in type_actions:
        actions.append(ActionItem.model_validate(item))

    # 2. Universal common actions (1930 helpline & cybercrime.gov.in)
    common_items = data.get("common", [])
    for item in common_items:
        actions.append(ActionItem.model_validate(item))

    return actions


def _merge_red_flags(
    rule: RuleResult,
    llm: LLMResult | None,
    url_check: UrlCheckResult | None,
) -> list[MergedRedFlag]:
    """Merge and de-duplicate red flags across rule, LLM, and URL detection layers."""
    merged: list[MergedRedFlag] = []
    seen_keys: set[tuple[str, str]] = set()

    # 1. Rule layer flags (contain precise offsets)
    for flag in rule.red_flags:
        quote = flag.matched_text.strip()
        key = (flag.category.lower(), quote.lower())
        if key not in seen_keys:
            seen_keys.add(key)
            merged.append(
                MergedRedFlag(
                    category=flag.category,
                    quote=quote,
                    start=flag.start,
                    end=flag.end,
                    reason=f"Detected pattern '{flag.category}' (severity weight {flag.weight}/5)",
                    source="rule",
                )
            )

    # 2. LLM layer flags
    if llm is not None:
        for flag in llm.red_flags:
            quote = (flag.quote or "").strip()
            key = (flag.category.lower(), quote.lower())
            if key not in seen_keys:
                seen_keys.add(key)
                merged.append(
                    MergedRedFlag(
                        category=flag.category,
                        quote=quote or None,
                        reason=flag.reason,
                        source="llm",
                    )
                )

    # 3. URL layer findings
    if url_check is not None:
        for finding in url_check.findings:
            if finding.status in {"suspicious", "malicious"}:
                source = (
                    "url_safe_browsing"
                    if finding.source == "safe_browsing"
                    else "url_local"
                )
                reason_str = (
                    ", ".join(finding.reasons) or f"Flagged as {finding.status}"
                )
                key = ("suspicious_link", finding.url.lower())
                if key not in seen_keys:
                    seen_keys.add(key)
                    merged.append(
                        MergedRedFlag(
                            category="suspicious_link",
                            quote=finding.url,
                            reason=f"URL threat indicator ({finding.source}): {reason_str}",
                            source=source,
                        )
                    )

    return merged


def fuse(
    rule: RuleResult,
    llm: LLMResult | None = None,
    url_check: UrlCheckResult | None = None,
    llm_error: str | None = None,
    url_check_error: str | None = None,
) -> FinalVerdict:
    """Fuse rule detector, Claude LLM, and Safe Browsing URL check into FinalVerdict.

    Strict Safety Rules Enforced:
    1. Never rely on the LLM alone: if only LLM says likely_scam while rule and URL are clean,
       cap verdict at 'suspicious'.
    2. A malicious Safe Browsing match forces at least 'likely_scam'.
    3. When layers disagree or confidence is low, lean 'suspicious', never 'safe'.
    4. A 'safe' verdict is allowed ONLY when rule is safe AND LLM (if available) is safe
       AND no URL is flagged.
    5. 'safe' verdict carries exact lowest-risk disclaimer. Never output '100% safe'.
    6. If LLM and URL check both fail or are missing, fall back to rule-only with degraded=true;
       if rule is clean in this state, lean 'suspicious' with degraded note.
    """
    sources_used: list[str] = ["rule"]
    degraded = False

    # Check degradation status
    if llm is None or llm_error:
        degraded = True
    else:
        sources_used.append("llm")

    if url_check is None or url_check_error or (url_check and url_check.error):
        degraded = True
    else:
        sources_used.append("url_check")

    # Layer Scores
    rule_score = rule.score

    # LLM synthetic score
    llm_score = 0
    if llm is not None:
        if llm.verdict == VERDICT_LIKELY_SCAM:
            llm_score = LLM_SCORE_LIKELY_SCAM
        elif llm.verdict == VERDICT_SUSPICIOUS:
            llm_score = LLM_SCORE_SUSPICIOUS
        else:
            llm_score = LLM_SCORE_SAFE

    # URL synthetic score
    url_score = URL_SCORE_CLEAN
    has_malicious_url = False
    has_suspicious_url = False

    if url_check is not None:
        if url_check.overall_status == "malicious":
            url_score = URL_SCORE_MALICIOUS
            has_malicious_url = True
        elif url_check.overall_status == "suspicious":
            url_score = URL_SCORE_SUSPICIOUS
            has_suspicious_url = True
        elif url_check.overall_status == "clean":
            url_score = URL_SCORE_CLEAN

    # Calculate fused score based on available layers
    has_llm = "llm" in sources_used
    has_url = "url_check" in sources_used
    has_active_url = has_url and url_score > 0

    if has_llm and has_active_url:
        fused_score_raw = (
            (rule_score * FUSION_WEIGHT_RULE)
            + (llm_score * FUSION_WEIGHT_LLM)
            + (url_score * FUSION_WEIGHT_URL)
        )
    elif has_llm:
        fused_score_raw = (rule_score * FUSION_WEIGHT_RULE_NO_URL) + (
            llm_score * FUSION_WEIGHT_LLM_NO_URL
        )
    elif has_active_url:
        fused_score_raw = (rule_score * FUSION_WEIGHT_RULE_NO_LLM) + (
            url_score * FUSION_WEIGHT_URL_NO_LLM
        )
    else:
        fused_score_raw = float(rule_score)

    fused_score = round(fused_score_raw)

    # Safety Rule 1: Never rely on the LLM alone
    # If LLM says likely_scam, but rule layer is clean (<30) and URL check is clean/absent,
    # cap verdict at 'suspicious' and cap score.
    llm_only_scam = (
        has_llm
        and llm.verdict == VERDICT_LIKELY_SCAM  # type: ignore[union-attr]
        and rule_score < 30
        and not has_malicious_url
        and not has_suspicious_url
    )

    # Determine preliminary verdict
    if fused_score >= FUSION_SCORE_THRESHOLD_LIKELY_SCAM:
        verdict = VERDICT_LIKELY_SCAM
    elif fused_score >= FUSION_SCORE_THRESHOLD_SAFE:
        verdict = VERDICT_SUSPICIOUS
    else:
        verdict = VERDICT_SAFE

    # Apply Safety Overrides
    if llm_only_scam:
        # Cap at suspicious per AGENT.md Section 5
        verdict = VERDICT_SUSPICIOUS
        fused_score = min(fused_score, FUSION_CAP_LLM_ONLY_SCORE)

    # Safety Rule 2: Malicious Safe Browsing URL forces at least likely_scam
    if has_malicious_url:
        verdict = VERDICT_LIKELY_SCAM
        fused_score = max(fused_score, FUSION_MALICIOUS_MIN_SCORE)

    # Safety Rule 3: When layers disagree, lean suspicious, never safe
    # e.g. rule is suspicious or likely_scam, but LLM says safe
    rule_flagged = rule.verdict in {VERDICT_SUSPICIOUS, VERDICT_LIKELY_SCAM}
    llm_flagged = has_llm and llm.verdict in {VERDICT_SUSPICIOUS, VERDICT_LIKELY_SCAM}  # type: ignore[union-attr]

    if (rule_flagged or llm_flagged or has_suspicious_url) and verdict == VERDICT_SAFE:
        verdict = VERDICT_SUSPICIOUS
        fused_score = max(fused_score, FUSION_SCORE_THRESHOLD_SAFE)

    # Safety Rule 6: If LLM and URL check both failed / missing and rule is clean,
    # lean 'suspicious' with note that deeper analysis was unavailable
    if (not has_llm) and (not has_url) and rule.verdict == VERDICT_SAFE:
        verdict = VERDICT_SUSPICIOUS
        fused_score = max(fused_score, FUSION_SCORE_THRESHOLD_SAFE)

    # Safety Rule 4: A "safe" verdict is allowed ONLY when rule is safe AND
    # LLM (if available) is safe AND no URL is flagged AND not degraded from clean
    if verdict == VERDICT_SAFE and (
        rule.verdict != VERDICT_SAFE
        or (has_llm and llm.verdict != VERDICT_SAFE)  # type: ignore[union-attr]
        or has_suspicious_url
        or has_malicious_url
    ):
        verdict = VERDICT_SUSPICIOUS
        fused_score = max(fused_score, FUSION_SCORE_THRESHOLD_SAFE)

    # Confidence calculation
    if not degraded:
        if verdict in {VERDICT_SAFE, VERDICT_LIKELY_SCAM}:
            confidence = CONFIDENCE_HIGH
        else:
            confidence = CONFIDENCE_MEDIUM
    else:
        confidence = max(
            CONFIDENCE_LOW, CONFIDENCE_MEDIUM - CONFIDENCE_DEGRADED_PENALTY
        )

    if has_llm and llm.confidence:  # type: ignore[union-attr]
        confidence = (confidence + llm.confidence) / 2.0  # type: ignore[union-attr]

    # Enforce MAX_CONFIDENCE_CAP (never 1.0 or 100% safe)
    confidence = min(round(confidence, 2), MAX_CONFIDENCE_CAP)

    # Resolve Scam Type
    rule_type = normalize_scam_type(rule.scam_type_guess)
    llm_type = normalize_scam_type(llm.scam_type if has_llm else None)

    if has_llm and llm_type not in {"none", "other"}:
        if llm_type == rule_type or rule_type in {"none", "other"}:
            final_scam_type = llm_type
        else:
            # Rule has specific type, LLM has different specific type -> prefer rule if rule is confident
            final_scam_type = rule_type if rule_score >= 60 else llm_type
    elif rule_type not in {"none", "other"}:
        final_scam_type = rule_type
    elif has_llm and llm_type != "none":
        final_scam_type = llm_type
    else:
        final_scam_type = "other" if verdict != VERDICT_SAFE else "none"

    if verdict == VERDICT_SAFE:
        final_scam_type = "none"

    # Merge Red Flags
    red_flags = _merge_red_flags(rule, llm, url_check)

    # Explanations
    explanations_data = load_explanations()
    if has_llm and llm.explanation_en and llm.explanation_hi:  # type: ignore[union-attr]
        explanation_en = llm.explanation_en  # type: ignore[union-attr]
        explanation_hi = llm.explanation_hi  # type: ignore[union-attr]
    else:
        # Fallback template from explanations.json
        if verdict == VERDICT_SAFE:
            tpl = explanations_data.get("safe", {})
        elif final_scam_type != "none" and final_scam_type in explanations_data:
            tpl = explanations_data[final_scam_type]
        else:
            tpl = explanations_data.get("suspicious_general", {})

        explanation_en = tpl.get("en", "")
        explanation_hi = tpl.get("hi", "")

        # If degraded, append degraded note
        if degraded:
            note = explanations_data.get("degraded_note", {})
            if note.get("en"):
                explanation_en = f"{explanation_en} {note['en']}"
            if note.get("hi"):
                explanation_hi = f"{explanation_hi} {note['hi']}"

    # Guarantee "100% safe" never appears anywhere in explanations
    explanation_en = explanation_en.replace("100% safe", "safe").replace(
        "completely safe", "safe"
    )
    explanation_hi = explanation_hi.replace("100% सुरक्षित", "सुरक्षित")

    # Safety Disclaimer per AGENT.md Section 5
    if verdict == VERDICT_SAFE:
        disclaimer = LOWEST_RISK_DISCLAIMER
    elif verdict == VERDICT_LIKELY_SCAM:
        disclaimer = HIGH_RISK_DISCLAIMER
    else:
        disclaimer = DEFAULT_RISK_DISCLAIMER

    # Actions Checklist
    actions = _build_action_checklist(
        final_scam_type if verdict != VERDICT_SAFE else "none"
    )

    return FinalVerdict(
        verdict=verdict,
        score=fused_score,
        confidence=confidence,
        scam_type=final_scam_type,
        red_flags=red_flags,
        explanation_en=explanation_en,
        explanation_hi=explanation_hi,
        actions=actions,
        disclaimer=disclaimer,
        sources_used=sources_used,
        degraded=degraded,
    )
