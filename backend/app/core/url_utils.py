"""URL extraction, defanging, and local heuristic utilities.

Shared across the rule detector and the URL checker layer.
Maintains data-driven rules loaded from backend/data/url_rules.json.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

# Path to url rules
RULES_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "url_rules.json"

# Trailing punctuation to strip from extracted URLs
TRAILING_PUNCTUATION = ".,;:!?)]}\'\""

# Comprehensive regex matching URLs:
# 1. Standard http(s) URLs
# 2. www-prefixed domains
# 3. Bare domains with known TLDs or paths (e.g. sbi-kyc-update.in/login, bit.ly/xyz)
# 4. Raw IPv4 addresses with optional ports and paths
URL_PATTERN = re.compile(
    r"(?i)\b("
    # Scheme-prefixed
    r"https?://[^\s<>\"')]+|"
    # www-prefixed
    r"www\.[^\s<>\"')]+|"
    # IPv4 address with optional port/path
    r"(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?(?:/[^\s<>\"')]*)?|"
    # Bare domain with common TLD and path/query or domain-name pattern
    r"(?:[a-zA-Z0-9-]+\.)+(?:com|in|org|net|xyz|top|buzz|click|link|info|online|site|app|co|io|ly|live|biz|vip|cc|tk|ml|ga|cf|gq)(?:/[^\s<>\"']*)?"
    r")"
)


def defang_url(url: str) -> str:
    """Defang a URL for safe user display so it cannot be accidentally clicked.

    Replaces:
        http:// -> hxxp://
        https:// -> hxxps://
        . -> [.]

    Example:
        https://sbi-kyc.in/login -> hxxps://sbi-kyc[.]in/login
        sbi-kyc.in/login -> sbi-kyc[.]in/login
    """
    if not url:
        return ""

    defanged = url
    if defanged.lower().startswith("https://"):
        defanged = "hxxps://" + defanged[8:]
    elif defanged.lower().startswith("http://"):
        defanged = "hxxp://" + defanged[7:]

    # Replace dots in the domain/host part, leaving path mostly intact or replacing all dots
    return defanged.replace(".", "[.]")


_cached_rules: dict | None = None


def load_url_rules(path: Path | None = None) -> dict:
    """Load URL heuristic rules from url_rules.json."""
    global _cached_rules
    if _cached_rules is not None and path is None:
        return _cached_rules

    target_path = path or RULES_FILE
    if not target_path.exists():
        return {
            "shortener_domains": [],
            "suspicious_tlds": [],
            "deceptive_domain_keywords": [],
            "trusted_suffixes": [],
            "apk_extensions": [".apk"],
        }

    with open(target_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if path is None:
        _cached_rules = data
    return data


def extract_urls(text: str) -> list[str]:
    """Extract and normalize all web URLs and link patterns from text.

    Supports:
        - http/https schemes
        - Bare domains like sbi-kyc-update.in/login
        - Text with Hindi/Devanagari or Hinglish surrounding the link
        - Normalizes bare domains to https:// for standardized processing
        - Strips trailing punctuation (.,;:!?)
        - Deduplicates while preserving order
    """
    if not text:
        return []

    found: list[str] = []
    seen: set[str] = set()

    for match in URL_PATTERN.finditer(text):
        raw = match.group(1).strip()
        cleaned = raw.rstrip(TRAILING_PUNCTUATION)

        # Skip numbers like 500.00, version numbers like 1.0.0
        if re.match(r"^\d+(?:\.\d+)+$", cleaned) and not re.match(
            r"^(?:\d{1,3}\.){3}\d{1,3}$", cleaned
        ):
            continue

        # Must have at least one dot or slash
        if "." not in cleaned and "/" not in cleaned:
            continue

        # Canonicalize to lower for deduplication
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        found.append(cleaned)

    return found


def normalize_url_for_lookup(url: str) -> str:
    """Ensure a URL has an http(s) scheme for lookup APIs and canonical checking."""
    trimmed = url.strip()
    if not trimmed.startswith(("http://", "https://")):
        return f"https://{trimmed}"
    return trimmed


def check_local_url_heuristics(url: str, rules: dict | None = None) -> list[str]:
    """Evaluate a URL against local heuristic rules.

    Returns a list of matching reason codes:
        - "url_shortener"
        - "apk_download"
        - "ip_host"
        - "lookalike_domain"
        - "suspicious_tld"
        - "excessive_hyphens"
    """
    if rules is None:
        rules = load_url_rules()

    reasons: list[str] = []
    canonical_url = normalize_url_for_lookup(url)
    parsed = urlparse(canonical_url)
    netloc = (parsed.netloc or "").lower()
    path = parsed.path.lower()

    # If netloc has a port, separate it
    host = netloc.split(":")[0]

    # 1. APK download check
    apk_exts = rules.get("apk_extensions", [".apk"])
    if any(path.endswith(ext) or ext in path for ext in apk_exts):
        reasons.append("apk_download")

    # 2. Raw IP address check
    if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", host):
        reasons.append("ip_host")

    # 3. URL shortener check
    shortener_domains = set(rules.get("shortener_domains", []))
    if host in shortener_domains or any(
        host.endswith("." + d) for d in shortener_domains
    ):
        reasons.append("url_shortener")

    # 4. Trusted suffix check
    trusted_suffixes = tuple(rules.get("trusted_suffixes", []))
    is_trusted = any(host.endswith(suffix) for suffix in trusted_suffixes)

    if not is_trusted:
        # 5. Lookalike / deceptive keyword in domain
        deceptive_keywords = rules.get("deceptive_domain_keywords", [])
        if any(kw in host for kw in deceptive_keywords):
            reasons.append("lookalike_domain")

        # 6. Suspicious TLD
        suspicious_tlds = rules.get("suspicious_tlds", [])
        if any(host.endswith(tld) for tld in suspicious_tlds):
            reasons.append("suspicious_tld")

        # 7. Excessive hyphens or subdomains (classic phishing signal)
        if host.count("-") >= 2 or host.count(".") >= 4:
            reasons.append("excessive_hyphens")

    return reasons
