"""Rule-based scam detector using patterns, local URL heuristics, and offset tracking."""

import re
import unicodedata
from collections import defaultdict

from app.core.constants import (
    DEFAULT_RISK_DISCLAIMER,
    HIGH_RISK_DISCLAIMER,
    LOWEST_RISK_DISCLAIMER,
    SCORE_THRESHOLD_LIKELY_SCAM,
    SCORE_THRESHOLD_SAFE,
    URL_WEIGHT_APK,
    URL_WEIGHT_DECEPTIVE,
    URL_WEIGHT_IP_HOST,
    URL_WEIGHT_SHORTENER,
    VERDICT_LIKELY_SCAM,
    VERDICT_SAFE,
    VERDICT_SUSPICIOUS,
)
from app.core.dataset import load_patterns
from app.core.url_utils import URL_PATTERN, check_local_url_heuristics, load_url_rules
from app.schemas.analysis import RedFlag, RuleResult
from app.schemas.dataset import Pattern

# Load data-driven URL rules from backend/data/url_rules.json
_url_rules = load_url_rules()
SHORTENER_DOMAINS = set(_url_rules.get("shortener_domains", []))
DECEPTIVE_DOMAIN_KEYWORDS = _url_rules.get("deceptive_domain_keywords", [])
TRUSTED_SUFFIXES = tuple(_url_rules.get("trusted_suffixes", [".gov.in", ".nic.in"]))
URL_REGEX = URL_PATTERN

# Protective context phrases (e.g. in authentic bank OTP alerts)
# When these appear around an OTP or PIN mention, it indicates an anti-fraud warning rather than a demand.
PROTECTIVE_PATTERNS = [
    re.compile(r"(?:do\s+not|never|don't)\s+share\b", re.IGNORECASE),
    re.compile(r"never\s+(?:asks?|call\s+asking)\s+for\b", re.IGNORECASE),
    re.compile(r"(?:do\s+not|never)\s+disclose\b", re.IGNORECASE),
    re.compile(r"(?:never|do\s+not)\s+(?:download|install)\b", re.IGNORECASE),
    re.compile(r"साझा\s+न\s+करें|शेयर\s+न\s+करें", re.IGNORECASE),
    re.compile(r"कभी\s+(?:भी\s+)?साझा\s+न\s+करें", re.IGNORECASE),
    re.compile(r"कभी\s+भी\s+(?:कोई\s+ऐप\s+)?(?:इंस्टॉल|डाउनलोड)\s+न\s+करें", re.IGNORECASE),
    re.compile(r"किसी\s+को\s+न\s+(?:बताएं|दें)", re.IGNORECASE),
    re.compile(r"nahi\s+maangta|share\s+mat\s+karna", re.IGNORECASE),
    re.compile(
        r"shakha\s+jakar|visiting\s+your\s+(?:nearest\s+)?(?:home\s+)?branch|शाखा\s+जाकर",
        re.IGNORECASE,
    ),
    re.compile(r"official\s+(?:portal|app|website)", re.IGNORECASE),
    re.compile(
        r"(?:cyber\s+safety\s+awareness|साइबर\s+सुरक्षा\s+सूचना|गृह\s+मंत्रालय)",
        re.IGNORECASE,
    ),
]


class RuleDetector:
    """Core rule-based scam detector."""

    def __init__(self, patterns: list[Pattern] | None = None) -> None:
        """Initialize detector with preloaded or custom patterns.

        Args:
            patterns: Optional list of Pattern models. If None, loaded from patterns.json.
        """
        self.patterns = patterns if patterns is not None else load_patterns()
        self._compiled_regexes = self._precompile_regexes()

    def _precompile_regexes(self) -> dict[str, list[re.Pattern]]:
        """Precompile regexes per pattern for high-performance matching."""
        compiled = {}
        for pattern in self.patterns:
            pattern_regex_list = []
            for r in pattern.regexes:
                try:
                    pattern_regex_list.append(re.compile(r, re.IGNORECASE))
                except re.error:
                    continue
            compiled[pattern.id] = pattern_regex_list
        return compiled

    def _is_protective_context(
        self, text: str, match_start: int, match_end: int
    ) -> bool:
        """Check if a match occurs within an anti-fraud protective warning.

        For example: 'Do not share this OTP with anyone' vs 'Share OTP for KYC'.
        """
        # Inspect a 120-character window around the match
        window_start = max(0, match_start - 80)
        window_end = min(len(text), match_end + 80)
        surrounding = text[window_start:window_end]

        for prot_pat in PROTECTIVE_PATTERNS:
            if prot_pat.search(surrounding):
                return True
        return False

    def _extract_url_red_flags(self, text: str) -> list[RedFlag]:
        """Apply local URL heuristics to extract suspicious URL red flags."""
        flags: list[RedFlag] = []

        for match in URL_REGEX.finditer(text):
            url_str = match.group().rstrip(".,;!?)")
            start = match.start()
            end = start + len(url_str)

            reasons = check_local_url_heuristics(url_str)

            # 1. APK download link
            if "apk_download" in reasons:
                flags.append(
                    RedFlag(
                        pattern_id="HEUR-URL-APK",
                        category="suspicious link/APK",
                        matched_text=url_str,
                        start=start,
                        end=end,
                        weight=URL_WEIGHT_APK,
                    )
                )
                continue

            # 2. Raw IP address host
            if "ip_host" in reasons:
                flags.append(
                    RedFlag(
                        pattern_id="HEUR-URL-IP",
                        category="suspicious link/APK",
                        matched_text=url_str,
                        start=start,
                        end=end,
                        weight=URL_WEIGHT_IP_HOST,
                    )
                )
                continue

            # 3. Known URL Shortener
            if "url_shortener" in reasons:
                flags.append(
                    RedFlag(
                        pattern_id="HEUR-URL-SHORTENER",
                        category="suspicious link/APK",
                        matched_text=url_str,
                        start=start,
                        end=end,
                        weight=URL_WEIGHT_SHORTENER,
                    )
                )
                continue

            # 4. Deceptive look-alike domain keywords (not ending in official .gov.in/.nic.in)
            if "lookalike_domain" in reasons:
                flags.append(
                    RedFlag(
                        pattern_id="HEUR-URL-DECEPTIVE",
                        category="suspicious link/APK",
                        matched_text=url_str,
                        start=start,
                        end=end,
                        weight=URL_WEIGHT_DECEPTIVE,
                    )
                )

        return flags

    def _match_pattern(self, text: str, pattern: Pattern) -> list[RedFlag]:
        """Match keywords and regexes of a single pattern against original text."""
        flags: list[RedFlag] = []
        seen_spans: set[tuple[int, int]] = set()

        # 1. Regex matching
        for regex in self._compiled_regexes.get(pattern.id, []):
            for match in regex.finditer(text):
                span = match.span()
                if span in seen_spans:
                    continue

                # If this occurs in a protective/awareness context, ignore it
                if self._is_protective_context(text, span[0], span[1]):
                    continue

                seen_spans.add(span)
                flags.append(
                    RedFlag(
                        pattern_id=pattern.id,
                        category=pattern.red_flag_category,
                        matched_text=match.group(),
                        start=span[0],
                        end=span[1],
                        weight=pattern.weight,
                    )
                )

        # 2. Keywords matching (en & hi)
        keywords = pattern.keywords_en + pattern.keywords_hi
        for kw in keywords:
            kw_clean = kw.strip()
            if not kw_clean or len(kw_clean) < 3:
                continue

            # Build safe word-boundary pattern
            kw_escaped = re.escape(kw_clean)
            kw_pattern = rf"(?i)(?:\b|^){kw_escaped}(?:\b|$)"

            try:
                for match in re.finditer(kw_pattern, text):
                    span = match.span()
                    # Check if already covered by another match
                    if any(s <= span[0] and span[1] <= e for (s, e) in seen_spans):
                        continue

                    if self._is_protective_context(text, span[0], span[1]):
                        continue

                    seen_spans.add(span)
                    flags.append(
                        RedFlag(
                            pattern_id=pattern.id,
                            category=pattern.red_flag_category,
                            matched_text=match.group(),
                            start=span[0],
                            end=span[1],
                            weight=pattern.weight,
                        )
                    )
            except re.error:
                continue

        return flags

    def analyze(self, text: str) -> RuleResult:
        """Analyze message text and return rule result with score, verdict, and red flags.

        Args:
            text: Raw input message string.

        Returns:
            RuleResult schema instance.
        """
        # Normalize text representation (NFC) while maintaining indexing
        normalized_text = unicodedata.normalize("NFC", text or "")
        trimmed = normalized_text.strip()

        if not trimmed:
            return RuleResult(
                score=0,
                verdict=VERDICT_SAFE,
                scam_type_guess=None,
                red_flags=[],
                disclaimer=LOWEST_RISK_DISCLAIMER,
            )

        # Collect red flags
        all_flags: list[RedFlag] = []
        scam_type_weights: defaultdict[str, int] = defaultdict(int)

        # 1. URL heuristic flags
        url_flags = self._extract_url_red_flags(normalized_text)
        all_flags.extend(url_flags)

        # 2. Pattern flags
        for pattern in self.patterns:
            pattern_flags = self._match_pattern(normalized_text, pattern)
            if pattern_flags:
                all_flags.extend(pattern_flags)
                # Accumulate weight for scam type deduction
                total_pattern_weight = sum(f.weight for f in pattern_flags)
                scam_type_weights[pattern.scam_type] += total_pattern_weight

        # Filter out redundant overlapping flags (prefer higher weight)
        filtered_flags = self._deduplicate_flags(all_flags)

        # If no flags found -> Safe
        if not filtered_flags:
            return RuleResult(
                score=0,
                verdict=VERDICT_SAFE,
                scam_type_guess=None,
                red_flags=[],
                disclaimer=LOWEST_RISK_DISCLAIMER,
            )

        # Calculate combined score (0-100)
        max_weight = max(f.weight for f in filtered_flags)

        # Base score driven by the most severe flag
        base_map = {5: 65, 4: 45, 3: 30, 2: 20, 1: 10}
        base_score = base_map.get(max_weight, 20)

        # Additional severity from secondary distinct flags
        secondary_weight = sum(
            f.weight * 4 for f in filtered_flags if f.weight < max_weight
        )
        score = min(100, base_score + secondary_weight)

        # Categorical verdict
        if score >= SCORE_THRESHOLD_LIKELY_SCAM:
            verdict = VERDICT_LIKELY_SCAM
            disclaimer = HIGH_RISK_DISCLAIMER
        elif score >= SCORE_THRESHOLD_SAFE:
            verdict = VERDICT_SUSPICIOUS
            disclaimer = DEFAULT_RISK_DISCLAIMER
        else:
            verdict = VERDICT_SAFE
            disclaimer = LOWEST_RISK_DISCLAIMER

        # Scam type guess
        scam_type_guess = None
        if scam_type_weights:
            scam_type_guess = max(scam_type_weights.items(), key=lambda x: x[1])[0]
        elif url_flags:
            scam_type_guess = "other"

        return RuleResult(
            score=score,
            verdict=verdict,
            scam_type_guess=scam_type_guess,
            red_flags=filtered_flags,
            disclaimer=disclaimer,
        )

    def _deduplicate_flags(self, flags: list[RedFlag]) -> list[RedFlag]:
        """Remove redundant overlapping flags, preserving highest weight and distinct spans."""
        if not flags:
            return []

        # Sort by weight descending, then by span length descending
        sorted_flags = sorted(flags, key=lambda f: (-f.weight, -(f.end - f.start)))
        selected: list[RedFlag] = []

        for flag in sorted_flags:
            # Check overlap with already selected flags
            overlaps = False
            for s in selected:
                # Same category and overlapping span
                if flag.category == s.category and max(flag.start, s.start) < min(
                    flag.end, s.end
                ):
                    overlaps = True
                    break
            if not overlaps:
                selected.append(flag)

        # Re-sort chronologically by start offset
        return sorted(selected, key=lambda f: f.start)
