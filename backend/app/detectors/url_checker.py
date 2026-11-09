"""URL Checker combining local heuristics and Google Safe Browsing Lookup API v4.

Privacy & Safety:
- Never fetches or visits user-submitted URLs (no HTTP requests to suspicious links).
- Sends ONLY URLs to Google Safe Browsing; never message text or user metadata.
- In-memory TTL cache keyed by SHA-256 hash of normalized URL to avoid duplicate API calls.
- Never logs message text or full URLs; logs only counts, status, and latency.
- Defangs all URLs for safe user-facing display (e.g. hxxps://example[.]com).
"""

from __future__ import annotations

import abc
import hashlib
import logging
import time
from typing import Any

import httpx

from app.core.config import settings
from app.core.constants import (
    MAX_URLS_TO_CHECK,
    SAFE_BROWSING_API_URL,
    SAFE_BROWSING_TIMEOUT_DEFAULT,
    URL_CACHE_TTL_SECONDS,
)
from app.core.url_utils import (
    check_local_url_heuristics,
    defang_url,
    extract_urls,
    normalize_url_for_lookup,
)
from app.schemas.url_check import UrlCheckResult, UrlFinding

logger = logging.getLogger(__name__)

THREAT_TYPES = [
    "MALWARE",
    "SOCIAL_ENGINEERING",
    "UNWANTED_SOFTWARE",
    "POTENTIALLY_HARMFUL_APPLICATION",
]


class SafeBrowsingError(Exception):
    """Raised on Safe Browsing API or connection errors."""


class SafeBrowsingTimeoutError(SafeBrowsingError):
    """Raised when Safe Browsing API request times out."""


class SafeBrowsingClient(abc.ABC):
    """Abstract interface for threat intelligence lookup against URLs."""

    @abc.abstractmethod
    def lookup(self, urls: list[str]) -> dict[str, list[str]]:
        """Look up a batch of URLs against Safe Browsing.

        Args:
            urls: List of normalized URLs to check.

        Returns:
            Dict mapping url -> list of threat types (e.g. ["MALWARE", "SOCIAL_ENGINEERING"]).
            Clean URLs will have an empty list or not be present.

        Raises:
            SafeBrowsingTimeoutError: on timeout
            SafeBrowsingError: on API/network failure
        """


class GoogleSafeBrowsingClient(SafeBrowsingClient):
    """Real Google Safe Browsing Lookup API (v4) client using httpx."""

    def __init__(
        self,
        api_key: str | None = None,
        timeout: int | None = None,
    ) -> None:
        self._api_key = api_key or settings.SAFE_BROWSING_API_KEY
        self._timeout = (
            timeout or settings.SAFE_BROWSING_TIMEOUT or SAFE_BROWSING_TIMEOUT_DEFAULT
        )

        if not self._api_key:
            raise SafeBrowsingError("SAFE_BROWSING_API_KEY is not set")

    def lookup(self, urls: list[str]) -> dict[str, list[str]]:
        """Query Google Safe Browsing Lookup API for threat matches.

        Privacy: sends only URLs; never logs message text or full URLs.
        """
        if not urls:
            return {}

        payload: dict[str, Any] = {
            "client": {
                "clientId": "scamshield",
                "clientVersion": "0.1.0",
            },
            "threatInfo": {
                "threatTypes": THREAT_TYPES,
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url} for url in urls],
            },
        }

        start_time = time.monotonic()
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(
                    SAFE_BROWSING_API_URL,
                    params={"key": self._api_key},
                    json=payload,
                )
                elapsed = time.monotonic() - start_time

            if response.status_code != 200:
                logger.warning(
                    "Safe Browsing API returned HTTP %d in %.2fs",
                    response.status_code,
                    elapsed,
                )
                raise SafeBrowsingError(
                    f"Safe Browsing API error: HTTP {response.status_code}"
                )

            data = response.json()
            matches = data.get("matches", [])
            threat_map: dict[str, list[str]] = {u: [] for u in urls}

            for item in matches:
                matched_url = item.get("threat", {}).get("url")
                threat_type = item.get("threatType", "UNKNOWN")
                if matched_url:
                    threat_map.setdefault(matched_url, []).append(threat_type)

            logger.info(
                "Safe Browsing lookup completed in %.2fs (%d URLs checked, %d matches)",
                elapsed,
                len(urls),
                len(matches),
            )
            return threat_map

        except httpx.TimeoutException as exc:
            elapsed = time.monotonic() - start_time
            logger.warning("Safe Browsing lookup timed out after %.2fs", elapsed)
            raise SafeBrowsingTimeoutError("Safe Browsing lookup timed out") from exc

        except httpx.HTTPError as exc:
            elapsed = time.monotonic() - start_time
            logger.warning(
                "Safe Browsing connection failure in %.2fs: %s",
                elapsed,
                type(exc).__name__,
            )
            raise SafeBrowsingError(
                f"Safe Browsing connection error: {type(exc).__name__}"
            ) from exc


class UrlChecker:
    """Orchestrates local heuristics and Google Safe Browsing lookups with caching."""

    def __init__(
        self,
        client: SafeBrowsingClient | None = None,
        cache_ttl: int = URL_CACHE_TTL_SECONDS,
        max_urls: int = MAX_URLS_TO_CHECK,
    ) -> None:
        self._client = client
        self._cache_ttl = cache_ttl
        self._max_urls = max_urls
        # In-memory TTL cache: sha256_hash -> (threat_list, expiry_timestamp)
        self._cache: dict[str, tuple[list[str], float]] = {}

    def _hash_url(self, url: str) -> str:
        """Compute SHA-256 hash of a normalized URL for in-memory cache key."""
        return hashlib.sha256(url.strip().lower().encode("utf-8")).hexdigest()

    def _get_cached_threats(self, normalized_url: str) -> list[str] | None:
        """Retrieve cached threat list if present and unexpired."""
        key = self._hash_url(normalized_url)
        entry = self._cache.get(key)
        if entry is None:
            return None
        threats, expiry = entry
        if time.monotonic() > expiry:
            del self._cache[key]
            return None
        return threats

    def _set_cached_threats(self, normalized_url: str, threats: list[str]) -> None:
        """Store threat list in the in-memory TTL cache."""
        key = self._hash_url(normalized_url)
        self._cache[key] = (threats, time.monotonic() + self._cache_ttl)

    def check_urls(self, urls: list[str]) -> UrlCheckResult:
        """Analyze a list of URLs using local heuristics followed by Safe Browsing."""
        if not urls:
            return UrlCheckResult(findings=[], overall_status="clean", error=None)

        # Enforce maximum URL cap
        capped_urls = urls[: self._max_urls]
        findings: list[UrlFinding] = []
        overall_status = "clean"
        error_msg: str | None = None

        # 1. Local Heuristics Check for each URL
        for raw_url in capped_urls:
            reasons = check_local_url_heuristics(raw_url)
            defanged = defang_url(raw_url)
            local_status = "suspicious" if reasons else "clean"

            findings.append(
                UrlFinding(
                    url=defanged,
                    source="local",
                    status=local_status,
                    reasons=reasons,
                )
            )
            if local_status == "suspicious" and overall_status == "clean":
                overall_status = "suspicious"

        # 2. Remote Safe Browsing Lookup
        # Determine which URLs need remote lookup vs are in cache
        lookup_needed: list[str] = []
        url_threat_results: dict[str, list[str]] = {}

        for raw_url in capped_urls:
            canonical = normalize_url_for_lookup(raw_url)
            cached = self._get_cached_threats(canonical)
            if cached is not None:
                url_threat_results[raw_url] = cached
            else:
                lookup_needed.append(raw_url)

        # Call client for uncached URLs if client is configured
        client_error: str | None = None
        if lookup_needed and self._client is not None:
            canonical_batch = [normalize_url_for_lookup(u) for u in lookup_needed]
            try:
                remote_results = self._client.lookup(canonical_batch)
                for raw_u, can_u in zip(lookup_needed, canonical_batch):
                    threats = remote_results.get(can_u, [])
                    self._set_cached_threats(can_u, threats)
                    url_threat_results[raw_u] = threats
            except (SafeBrowsingTimeoutError, SafeBrowsingError) as exc:
                client_error = str(exc)
                logger.warning(
                    "Safe Browsing lookup failed gracefully: %s", type(exc).__name__
                )
        elif self._client is None:
            client_error = "Safe Browsing is not configured or disabled"

        # Record Safe Browsing findings
        for raw_url in capped_urls:
            defanged = defang_url(raw_url)
            if raw_url in url_threat_results:
                threats = url_threat_results[raw_url]
                if threats:
                    findings.append(
                        UrlFinding(
                            url=defanged,
                            source="safe_browsing",
                            status="malicious",
                            reasons=[f"safe_browsing:{t}" for t in threats],
                        )
                    )
                    overall_status = "malicious"
                else:
                    findings.append(
                        UrlFinding(
                            url=defanged,
                            source="safe_browsing",
                            status="clean",
                            reasons=[],
                        )
                    )
            else:
                # Could not check remotely (API failure, timeout, or missing key)
                findings.append(
                    UrlFinding(
                        url=defanged,
                        source="safe_browsing",
                        status="unchecked",
                        reasons=[],
                    )
                )

        if client_error:
            error_msg = client_error
            # If no malicious or suspicious finding was discovered, mark overall as unchecked
            if overall_status == "clean":
                overall_status = "unchecked"

        return UrlCheckResult(
            findings=findings,
            overall_status=overall_status,
            error=error_msg,
        )

    def check_text(self, text: str) -> UrlCheckResult:
        """Extract URLs from message text and run full URL check."""
        urls = extract_urls(text)
        return self.check_urls(urls)
