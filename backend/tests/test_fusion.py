"""Tests for Score Fusion Engine and Final Verdict generation.

Verifies all safety rules from AGENT.md Section 5:
- LLM-only scam is capped at suspicious
- Malicious Safe Browsing URL forces likely_scam
- Clean everywhere produces safe verdict with exact lowest-risk disclaimer
- Disagreeing layers lean suspicious, never safe
- Degraded mode fallback (rule-only when LLM/URL fail)
- Both failing while rule is clean leans suspicious
- De-duplicated red flags
- Action checklist always contains 1930 and cybercrime.gov.in
- Never outputs "100% safe"
- No user message text leaked in responses
"""

from __future__ import annotations

import pytest
from app.core.constants import (
    DEFAULT_RISK_DISCLAIMER,
    HIGH_RISK_DISCLAIMER,
    LOWEST_RISK_DISCLAIMER,
    VERDICT_LIKELY_SCAM,
    VERDICT_SAFE,
    VERDICT_SUSPICIOUS,
)
from app.core.fusion import fuse, normalize_scam_type
from app.schemas.analysis import RedFlag, RuleResult
from app.schemas.llm import LLMRedFlag, LLMResult
from app.schemas.url_check import UrlCheckResult, UrlFinding
from httpx import ASGITransport, AsyncClient


def make_rule_result(
    verdict: str = "safe",
    score: int = 0,
    scam_type_guess: str | None = None,
    red_flags: list[RedFlag] | None = None,
) -> RuleResult:
    """Helper to create RuleResult for testing."""
    disclaimer = (
        LOWEST_RISK_DISCLAIMER
        if verdict == "safe"
        else (
            HIGH_RISK_DISCLAIMER
            if verdict == "likely_scam"
            else DEFAULT_RISK_DISCLAIMER
        )
    )
    return RuleResult(
        score=score,
        verdict=verdict,  # type: ignore[arg-type]
        scam_type_guess=scam_type_guess,
        red_flags=red_flags or [],
        disclaimer=disclaimer,
    )


def make_llm_result(
    verdict: str = "safe",
    scam_type: str = "none",
    confidence: float = 0.90,
    red_flags: list[LLMRedFlag] | None = None,
    explanation_en: str = "Test explanation in English.",
    explanation_hi: str = "परीक्षण हिंदी व्याख्या।",
) -> LLMResult:
    """Helper to create LLMResult for testing."""
    return LLMResult(
        verdict=verdict,
        scam_type=scam_type,
        red_flags=red_flags or [],
        explanation_en=explanation_en,
        explanation_hi=explanation_hi,
        confidence=confidence,
    )


def make_url_check_result(
    overall_status: str = "clean",
    findings: list[UrlFinding] | None = None,
    error: str | None = None,
) -> UrlCheckResult:
    """Helper to create UrlCheckResult for testing."""
    return UrlCheckResult(
        findings=findings or [],
        overall_status=overall_status,  # type: ignore[arg-type]
        error=error,
    )


# ---------------------------------------------------------------------------
# Unit Tests for `fuse()` Safety Rules
# ---------------------------------------------------------------------------


class TestScoreFusionSafetyRules:
    """Tests strictly verifying AGENT.md Section 5 rules."""

    def test_llm_only_scam_is_capped_at_suspicious(self):
        """If only LLM says likely_scam, but rule and URL are clean, verdict is capped at suspicious."""
        rule = make_rule_result(verdict="safe", score=10)
        llm = make_llm_result(
            verdict="likely_scam", scam_type="digital_arrest", confidence=0.95
        )
        url_check = make_url_check_result(overall_status="clean")

        verdict = fuse(rule=rule, llm=llm, url_check=url_check)

        assert verdict.verdict == VERDICT_SUSPICIOUS
        assert verdict.score <= 55
        assert verdict.scam_type == "digital_arrest"

    def test_malicious_url_forces_likely_scam(self):
        """A malicious Safe Browsing match forces at least likely_scam."""
        rule = make_rule_result(verdict="safe", score=15)
        llm = make_llm_result(verdict="safe", scam_type="none", confidence=0.85)
        finding = UrlFinding(
            url="hxxps://bad-phish[.]com",
            source="safe_browsing",
            status="malicious",
            reasons=["safe_browsing:SOCIAL_ENGINEERING"],
        )
        url_check = make_url_check_result(
            overall_status="malicious", findings=[finding]
        )

        verdict = fuse(rule=rule, llm=llm, url_check=url_check)

        assert verdict.verdict == VERDICT_LIKELY_SCAM
        assert verdict.score >= 85
        assert any(rf.source == "url_safe_browsing" for rf in verdict.red_flags)

    def test_clean_everywhere_gives_safe_with_exact_disclaimer(self):
        """When rule is safe, LLM is safe, and URL is clean, verdict is safe with exact disclaimer."""
        rule = make_rule_result(verdict="safe", score=5)
        llm = make_llm_result(verdict="safe", scam_type="none", confidence=0.90)
        url_check = make_url_check_result(overall_status="clean")

        verdict = fuse(rule=rule, llm=llm, url_check=url_check)

        assert verdict.verdict == VERDICT_SAFE
        assert verdict.score < 25
        assert verdict.disclaimer == LOWEST_RISK_DISCLAIMER
        assert verdict.scam_type == "none"

    def test_never_outputs_100_percent_safe(self):
        """Never output '100% safe' or confidence 1.0 even on pristine genuine messages."""
        rule = make_rule_result(verdict="safe", score=0)
        llm = make_llm_result(
            verdict="safe",
            scam_type="none",
            confidence=1.0,
            explanation_en="This message is 100% safe and verified.",
            explanation_hi="यह संदेश 100% सुरक्षित है।",
        )
        url_check = make_url_check_result(overall_status="clean")

        verdict = fuse(rule=rule, llm=llm, url_check=url_check)

        assert verdict.confidence <= 0.95
        assert "100% safe" not in verdict.explanation_en
        assert "100% सुरक्षित" not in verdict.explanation_hi

    def test_disagreeing_layers_lean_suspicious(self):
        """When rule layer detects scam indicators but LLM says safe, lean suspicious, never safe."""
        flag = RedFlag(
            pattern_id="PAT-001",
            category="authority impersonation",
            matched_text="CBI warrant",
            start=0,
            end=11,
            weight=5,
        )
        rule = make_rule_result(
            verdict="likely_scam",
            score=70,
            scam_type_guess="digital arrest",
            red_flags=[flag],
        )
        llm = make_llm_result(verdict="safe", scam_type="none", confidence=0.70)
        url_check = make_url_check_result(overall_status="clean")

        verdict = fuse(rule=rule, llm=llm, url_check=url_check)

        # Must not be safe!
        assert verdict.verdict != VERDICT_SAFE
        assert verdict.verdict in {VERDICT_SUSPICIOUS, VERDICT_LIKELY_SCAM}

    def test_llm_failure_falls_back_to_rule_only_with_degraded(self):
        """When LLM fails with error, falls back to rule result with degraded=true."""
        flag = RedFlag(
            pattern_id="PAT-002",
            category="account blocked threat",
            matched_text="blocked today",
            start=5,
            end=18,
            weight=4,
        )
        rule = make_rule_result(
            verdict="likely_scam",
            score=65,
            scam_type_guess="fake KYC",
            red_flags=[flag],
        )
        url_check = make_url_check_result(overall_status="clean")

        verdict = fuse(
            rule=rule,
            llm=None,
            url_check=url_check,
            llm_error="Anthropic API timeout",
        )

        assert verdict.degraded is True
        assert "llm" not in verdict.sources_used
        assert "rule" in verdict.sources_used
        assert verdict.verdict == VERDICT_LIKELY_SCAM
        assert verdict.scam_type == "fake_kyc"

    def test_url_check_failure_falls_back_gracefully(self):
        """When URL check fails, falls back gracefully with degraded=true."""
        rule = make_rule_result(verdict="safe", score=10)
        llm = make_llm_result(verdict="safe", scam_type="none")
        url_check = make_url_check_result(
            overall_status="unchecked", error="Safe Browsing 503"
        )

        verdict = fuse(
            rule=rule,
            llm=llm,
            url_check=url_check,
            url_check_error="Safe Browsing 503",
        )

        assert verdict.degraded is True
        assert "url_check" not in verdict.sources_used

    def test_both_failing_and_rule_clean_leans_suspicious(self):
        """When LLM and URL check both fail and rule is clean, lean suspicious with degraded note."""
        rule = make_rule_result(verdict="safe", score=5)

        verdict = fuse(
            rule=rule,
            llm=None,
            url_check=None,
            llm_error="API failure",
            url_check_error="URL check failure",
        )

        assert verdict.degraded is True
        assert verdict.verdict == VERDICT_SUSPICIOUS
        assert "unavailable" in verdict.explanation_en.lower()


# ---------------------------------------------------------------------------
# Unit Tests for Content, De-duplication, and Actions
# ---------------------------------------------------------------------------


class TestFusionFeatures:
    """Tests for scam type resolution, red flag de-duplication, and action items."""

    def test_scam_type_prefers_llm_when_specific(self):
        """Specific LLM scam type is preferred when valid."""
        rule = make_rule_result(
            verdict="likely_scam", score=65, scam_type_guess="digital arrest"
        )
        llm = make_llm_result(
            verdict="likely_scam", scam_type="digital_arrest", confidence=0.95
        )
        verdict = fuse(rule=rule, llm=llm, url_check=make_url_check_result())
        assert verdict.scam_type == "digital_arrest"

    def test_scam_type_falls_back_to_rule_when_llm_is_none_or_other(self):
        """When LLM says other or none, specific rule guess is used."""
        rule = make_rule_result(
            verdict="likely_scam", score=70, scam_type_guess="electricity-bill threat"
        )
        llm = make_llm_result(verdict="likely_scam", scam_type="other", confidence=0.75)
        verdict = fuse(rule=rule, llm=llm, url_check=make_url_check_result())
        assert verdict.scam_type == "electricity_bill_threat"

    def test_red_flags_deduplicated_across_layers(self):
        """Red flags with matching category and quote are de-duplicated."""
        rule_flag = RedFlag(
            pattern_id="PAT-001",
            category="authority_impersonation",
            matched_text="CBI officer",
            start=10,
            end=21,
            weight=5,
        )
        llm_flag = LLMRedFlag(
            category="authority_impersonation",
            quote="CBI officer",
            reason="Impersonating federal agency",
        )
        rule = make_rule_result(verdict="likely_scam", score=65, red_flags=[rule_flag])
        llm = make_llm_result(verdict="likely_scam", red_flags=[llm_flag])

        verdict = fuse(rule=rule, llm=llm, url_check=make_url_check_result())

        authority_flags = [
            f for f in verdict.red_flags if f.category == "authority_impersonation"
        ]
        assert len(authority_flags) == 1

    def test_actions_always_contain_1930_and_cybercrime(self):
        """Action checklist always includes 1930 helpline and cybercrime.gov.in."""
        for stype in [
            "digital_arrest",
            "fake_kyc",
            "upi_refund",
            "job_task_scam",
            "other",
            "none",
        ]:
            rule = make_rule_result(verdict="likely_scam", score=65)
            llm = make_llm_result(verdict="likely_scam", scam_type=stype)
            verdict = fuse(rule=rule, llm=llm, url_check=make_url_check_result())

            action_ids = {a.id for a in verdict.actions}
            assert "ACT-1930" in action_ids
            assert "ACT-CYBERCRIME" in action_ids

            helpline_action = next(a for a in verdict.actions if a.id == "ACT-1930")
            assert helpline_action.phone == "1930"
            portal_action = next(a for a in verdict.actions if a.id == "ACT-CYBERCRIME")
            assert "cybercrime.gov.in" in portal_action.link

    def test_explanations_present_in_hindi_and_english(self):
        """Both explanation_en and explanation_hi are always populated and non-empty."""
        rule = make_rule_result(
            verdict="likely_scam", score=65, scam_type_guess="fake KYC"
        )
        verdict = fuse(rule=rule, llm=None, url_check=make_url_check_result())

        assert len(verdict.explanation_en) > 20
        assert len(verdict.explanation_hi) > 20

    def test_normalize_scam_type_utility(self):
        """Tests scam type string normalization to snake_case."""
        assert normalize_scam_type("digital arrest") == "digital_arrest"
        assert normalize_scam_type("fake KYC") == "fake_kyc"
        assert (
            normalize_scam_type("electricity-bill threat") == "electricity_bill_threat"
        )
        assert normalize_scam_type(None) == "none"


# ---------------------------------------------------------------------------
# API Integration Tests for Full Final Shape
# ---------------------------------------------------------------------------


class TestApiAnalyzeFinalVerdict:
    """Tests for POST /api/analyze returning the final verdict structure."""

    @pytest.mark.anyio
    async def test_endpoint_returns_verdict_and_layers(self):
        """POST /api/analyze returns both verdict and layers, with no text leakage."""
        from app.main import app

        secret_marker = "SECRET_USER_NAME_DO_NOT_LEAK"
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "text": f"Dear {secret_marker}, CBI non-bailable arrest warrant has been issued. Connect on Skype."
            }
            response = await client.post("/api/analyze", json=payload)

        assert response.status_code == 200
        data = response.json()

        # Check top-level keys
        assert "verdict" in data
        assert "layers" in data
        assert "rule" in data["layers"]

        # Verify privacy: original message text is NOT present in response
        raw_response_text = response.text
        assert secret_marker not in raw_response_text

        # Verify final verdict structure
        final = data["verdict"]
        assert final["verdict"] in {"safe", "suspicious", "likely_scam"}
        assert 0 <= final["score"] <= 100
        assert 0.0 <= final["confidence"] <= 0.95
        assert len(final["explanation_en"]) > 0
        assert len(final["explanation_hi"]) > 0
        assert len(final["actions"]) >= 2
        assert any(a["id"] == "ACT-1930" for a in final["actions"])

    @pytest.mark.anyio
    async def test_endpoint_degraded_when_external_apis_absent(self):
        """Without API keys configured, degraded flag is true."""
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {"text": "Your OTP is 987654. Do not share with bank staff."}
            response = await client.post("/api/analyze", json=payload)

        data = response.json()
        assert data["verdict"]["degraded"] is True
        assert data["verdict"]["verdict"] == "safe"
