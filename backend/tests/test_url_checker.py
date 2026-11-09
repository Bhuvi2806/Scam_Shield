"""Tests for URL extraction, defanging, local heuristics, caching, and Safe Browsing.

All tests use a FAKE Safe Browsing client — no real Google APIs are ever called.
"""

from __future__ import annotations

import pytest
from app.core.url_utils import (
    check_local_url_heuristics,
    defang_url,
    extract_urls,
)
from app.detectors.url_checker import (
    SafeBrowsingClient,
    SafeBrowsingError,
    SafeBrowsingTimeoutError,
    UrlChecker,
)
from app.schemas.url_check import UrlCheckResult
from httpx import ASGITransport, AsyncClient


class FakeSafeBrowsingClient(SafeBrowsingClient):
    """Test fake client that returns predefined threat matches."""

    def __init__(
        self,
        threat_map: dict[str, list[str]] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.threat_map = threat_map or {}
        self.error = error
        self.call_count = 0
        self.checked_batches: list[list[str]] = []

    def lookup(self, urls: list[str]) -> dict[str, list[str]]:
        self.call_count += 1
        self.checked_batches.append(list(urls))
        if self.error:
            raise self.error
        return {u: self.threat_map.get(u, []) for u in urls}


# ---------------------------------------------------------------------------
# 1. URL Extraction & Defanging Tests
# ---------------------------------------------------------------------------


class TestUrlUtils:
    """Tests for extract_urls, defang_url, and local heuristics."""

    def test_defang_url(self):
        """URLs are defanged so they cannot be clicked accidentally."""
        assert defang_url("https://example.com/test") == "hxxps://example[.]com/test"
        assert defang_url("http://insecure.net") == "hxxp://insecure[.]net"
        assert defang_url("bare-domain.org/path") == "bare-domain[.]org/path"
        assert defang_url("") == ""

    def test_extract_urls_with_schemes(self):
        """Extracts standard http and https URLs."""
        text = "Check http://example.com and also https://secure.org/path"
        urls = extract_urls(text)
        assert urls == ["http://example.com", "https://secure.org/path"]

    def test_extract_urls_bare_domains(self):
        """Extracts bare domains with paths or common TLDs."""
        text = "Visit sbi-kyc-update.in/login immediately to unblock your account."
        urls = extract_urls(text)
        assert "sbi-kyc-update.in/login" in urls

    def test_extract_urls_hindi_and_hinglish_surrounding(self):
        """Extracts URLs surrounded by Devanagari Hindi or Hinglish text."""
        hindi_text = (
            "तुरंत इस लिंक पर क्लिक करें http://pnb-kyc.xyz/verify और अपना खाता बचाएं।"
        )
        urls = extract_urls(hindi_text)
        assert urls == ["http://pnb-kyc.xyz/verify"]

        hinglish_text = (
            "Aapka bijli connection cut ho jayega, bill pay karein bit.ly/bijli-pay par"
        )
        urls_hinglish = extract_urls(hinglish_text)
        assert "bit.ly/bijli-pay" in urls_hinglish

    def test_extract_urls_strips_trailing_punctuation(self):
        """Strips periods, commas, parentheses, brackets, and quotes."""
        text = "Go to (https://example.com/login), or see: https://test.org/check."
        urls = extract_urls(text)
        assert urls == ["https://example.com/login", "https://test.org/check"]

    def test_extract_urls_empty_or_no_urls(self):
        """Returns empty list when text contains no URLs."""
        assert extract_urls("Normal text with no links whatsoever") == []
        assert extract_urls("") == []
        assert extract_urls("Total amount is Rs. 500.00 only.") == []


# ---------------------------------------------------------------------------
# 2. Local Heuristic Checks Tests
# ---------------------------------------------------------------------------


class TestLocalHeuristics:
    """Tests for each local heuristic firing accurately."""

    def test_shortener_heuristic(self):
        """Known URL shorteners trigger url_shortener reason."""
        reasons = check_local_url_heuristics("https://bit.ly/3xyzAbc")
        assert "url_shortener" in reasons

        reasons_tiny = check_local_url_heuristics("http://tinyurl.com/update-now")
        assert "url_shortener" in reasons_tiny

    def test_apk_download_heuristic(self):
        """Direct .apk download links trigger apk_download reason."""
        reasons = check_local_url_heuristics(
            "http://example.com/files/sbi_yono_support.apk"
        )
        assert "apk_download" in reasons

    def test_ip_host_heuristic(self):
        """Raw IPv4 address hosts trigger ip_host reason."""
        reasons = check_local_url_heuristics("http://192.168.1.100:8080/portal")
        assert "ip_host" in reasons

    def test_lookalike_domain_heuristic(self):
        """Deceptive bank/gov keyword domains trigger lookalike_domain reason."""
        reasons = check_local_url_heuristics(
            "http://sbi-netbanking-verification.com/login"
        )
        assert "lookalike_domain" in reasons

    def test_suspicious_tld_heuristic(self):
        """Suspicious TLDs trigger suspicious_tld reason."""
        reasons = check_local_url_heuristics("http://rewards-claim.xyz")
        assert "suspicious_tld" in reasons

    def test_legitimate_gov_domain_not_flagged_as_lookalike(self):
        """Official .gov.in domains are trusted and not flagged as lookalikes."""
        reasons = check_local_url_heuristics("https://cybercrime.gov.in/report")
        assert "lookalike_domain" not in reasons


# ---------------------------------------------------------------------------
# 3. UrlChecker & Safe Browsing Integration Tests (with Fake Client)
# ---------------------------------------------------------------------------


class TestUrlChecker:
    """Tests for UrlChecker caching, batching, capping, and fallback."""

    def test_message_with_no_url_returns_empty_clean_result(self):
        """Message with no URL returns empty findings and clean status."""
        client = FakeSafeBrowsingClient()
        checker = UrlChecker(client=client)
        result = checker.check_text("Normal text without links")

        assert isinstance(result, UrlCheckResult)
        assert result.findings == []
        assert result.overall_status == "clean"
        assert result.error is None
        assert client.call_count == 0

    def test_malicious_match_reported_with_threat_type(self):
        """Safe Browsing match is reported as malicious with threat type in reasons."""
        malicious_url = "https://phishing-site.com/login"
        client = FakeSafeBrowsingClient(
            threat_map={malicious_url: ["SOCIAL_ENGINEERING"]}
        )
        checker = UrlChecker(client=client)
        result = checker.check_text(f"Click here: {malicious_url}")

        assert result.overall_status == "malicious"
        sb_findings = [f for f in result.findings if f.source == "safe_browsing"]
        assert len(sb_findings) == 1
        assert sb_findings[0].status == "malicious"
        assert "safe_browsing:SOCIAL_ENGINEERING" in sb_findings[0].reasons
        assert defang_url(malicious_url) == sb_findings[0].url

    def test_clean_safe_browsing_match(self):
        """Safe Browsing clean result reports status clean."""
        safe_url = "https://google.com"
        client = FakeSafeBrowsingClient(threat_map={safe_url: []})
        checker = UrlChecker(client=client)
        result = checker.check_text(f"Search here: {safe_url}")

        assert result.overall_status == "clean"
        sb_findings = [f for f in result.findings if f.source == "safe_browsing"]
        assert len(sb_findings) == 1
        assert sb_findings[0].status == "clean"

    def test_api_failure_falls_back_to_local_only_with_unchecked(self):
        """Safe Browsing API failure gracefully falls back to local findings with unchecked status."""
        client = FakeSafeBrowsingClient(
            error=SafeBrowsingError("Google API 500 Internal Error")
        )
        checker = UrlChecker(client=client)
        result = checker.check_text("Look at bit.ly/something")

        # Local finding detected the shortener as suspicious
        local_findings = [f for f in result.findings if f.source == "local"]
        assert len(local_findings) == 1
        assert local_findings[0].status == "suspicious"
        assert "url_shortener" in local_findings[0].reasons

        # Safe browsing finding is marked unchecked
        sb_findings = [f for f in result.findings if f.source == "safe_browsing"]
        assert len(sb_findings) == 1
        assert sb_findings[0].status == "unchecked"
        assert result.error is not None
        assert "Google API 500" in result.error

    def test_api_timeout_falls_back_to_unchecked(self):
        """Safe Browsing timeout gracefully marks remote finding unchecked."""
        client = FakeSafeBrowsingClient(
            error=SafeBrowsingTimeoutError("Lookup timed out")
        )
        checker = UrlChecker(client=client)
        result = checker.check_text("Check https://clean-site.org")

        assert result.overall_status == "unchecked"
        assert result.error is not None
        sb_findings = [f for f in result.findings if f.source == "safe_browsing"]
        assert sb_findings[0].status == "unchecked"

    def test_missing_client_falls_back_to_unchecked(self):
        """When client is None (no key), remote check is unchecked without crash."""
        checker = UrlChecker(client=None)
        result = checker.check_text("Check https://clean-site.org")

        assert result.overall_status == "unchecked"
        assert result.error is not None
        sb_findings = [f for f in result.findings if f.source == "safe_browsing"]
        assert sb_findings[0].status == "unchecked"

    def test_in_memory_ttl_cache_prevents_duplicate_calls(self):
        """Checking the same URL repeatedly uses in-memory cache without calling API."""
        url = "https://repeated-domain.com/login"
        client = FakeSafeBrowsingClient(threat_map={url: ["MALWARE"]})
        checker = UrlChecker(client=client, cache_ttl=3600)

        # First call hits the client
        res1 = checker.check_text(f"Message 1 with {url}")
        assert client.call_count == 1
        assert res1.overall_status == "malicious"

        # Second call with same URL must hit cache
        res2 = checker.check_text(f"Message 2 with {url}")
        assert client.call_count == 1  # Unchanged!
        assert res2.overall_status == "malicious"

    def test_url_cap_is_enforced(self):
        """Max URL cap limits the number of URLs processed and checked."""
        client = FakeSafeBrowsingClient()
        checker = UrlChecker(client=client, max_urls=3)

        # 5 distinct URLs in text
        text = (
            "Links: https://site1.com https://site2.com https://site3.com "
            "https://site4.com https://site5.com"
        )
        result = checker.check_text(text)

        # Only 3 URLs should be checked
        assert client.call_count == 1
        assert len(client.checked_batches[0]) == 3
        # 3 local + 3 safe_browsing = 6 findings
        assert len(result.findings) == 6


# ---------------------------------------------------------------------------
# 4. /api/analyze Integration Tests
# ---------------------------------------------------------------------------


class TestApiAnalyzeUrlCheckIntegration:
    """Tests for URL check in POST /api/analyze endpoint."""

    @pytest.mark.anyio
    async def test_analyze_endpoint_returns_url_check(self, monkeypatch):
        """POST /api/analyze includes url_check field."""
        from app.main import app

        fake_sb_client = FakeSafeBrowsingClient(
            threat_map={"https://phishing-bank.xyz": ["SOCIAL_ENGINEERING"]}
        )
        monkeypatch.setattr(
            "app.api.analyze._get_safe_browsing_client", lambda: fake_sb_client
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "text": "Your account is locked. Update KYC at https://phishing-bank.xyz"
            }
            response = await client.post("/api/analyze", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "verdict" in data
        assert "layers" in data
        assert "rule" in data["layers"]
        assert "llm" in data["layers"]
        assert "url_check" in data["layers"]
        assert data["layers"]["url_check"] is not None
        assert data["layers"]["url_check"]["overall_status"] == "malicious"
        assert len(data["layers"]["url_check"]["findings"]) > 0
        assert data["verdict"]["verdict"] == "likely_scam"

    @pytest.mark.anyio
    async def test_analyze_endpoint_url_check_fails_gracefully(self, monkeypatch):
        """If URL checking fails, /api/analyze still returns rule result."""
        from app.main import app

        fake_sb_client = FakeSafeBrowsingClient(
            error=SafeBrowsingError("Timeout connecting to Safe Browsing")
        )
        monkeypatch.setattr(
            "app.api.analyze._get_safe_browsing_client", lambda: fake_sb_client
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "text": "URGENT: Electricity will be disconnected tonight. Pay bill at https://bijli-pay.com"
            }
            response = await client.post("/api/analyze", json=payload)

        assert response.status_code == 200
        data = response.json()
        # Rule result still present and accurate
        assert "layers" in data
        assert "rule" in data["layers"]
        assert data["layers"]["rule"]["verdict"] in {"suspicious", "likely_scam"}
        # URL check returned with error details
        assert data["layers"]["url_check"] is not None
        assert data["layers"]["url_check"]["error"] is not None
        assert data["verdict"]["degraded"] is True

    @pytest.mark.anyio
    async def test_analyze_endpoint_url_check_disabled(self, monkeypatch):
        """When URL_CHECK_ENABLED=False, url_check field is null."""
        from app.core.config import Settings

        test_settings = Settings(URL_CHECK_ENABLED=False)
        monkeypatch.setattr("app.api.analyze.settings", test_settings)

        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {"text": "Click here https://example.com"}
            response = await client.post("/api/analyze", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "layers" in data
        assert data["layers"]["url_check"] is None
