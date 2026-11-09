"""Constants for rule detection thresholds, verdicts, and safety disclaimers."""

from typing import Final

# Verdicts
VERDICT_SAFE: Final[str] = "safe"
VERDICT_SUSPICIOUS: Final[str] = "suspicious"
VERDICT_LIKELY_SCAM: Final[str] = "likely_scam"

# Thresholds (0-100 score)
# Score < SAFE_THRESHOLD: safe
# SAFE_THRESHOLD <= Score < SUSPICIOUS_THRESHOLD: suspicious
# Score >= SUSPICIOUS_THRESHOLD: likely_scam
SCORE_THRESHOLD_SAFE: Final[int] = 30
SCORE_THRESHOLD_LIKELY_SCAM: Final[int] = 60

# Text constraints
MAX_TEXT_LENGTH: Final[int] = 10000

# Safety disclaimers per AGENT.md Section 5
LOWEST_RISK_DISCLAIMER: Final[str] = (
    "No red flag found, but never share OTP, PIN or money with anyone who contacts you."
)
DEFAULT_RISK_DISCLAIMER: Final[str] = (
    "Suspicious indicators detected. Exercise extreme caution; never share OTP, PIN, passwords, "
    "or transfer funds without independent verification."
)
HIGH_RISK_DISCLAIMER: Final[str] = (
    "High-risk scam indicators detected! Do not click any links, do not send money, "
    "and report immediately to 1930 or cybercrime.gov.in."
)

# URL Heuristic weights (1-5)
URL_WEIGHT_APK: Final[int] = 5
URL_WEIGHT_IP_HOST: Final[int] = 4
URL_WEIGHT_DECEPTIVE: Final[int] = 4
URL_WEIGHT_SHORTENER: Final[int] = 3

# URL Checker and Safe Browsing constraints
MAX_URLS_TO_CHECK: Final[int] = 10
SAFE_BROWSING_TIMEOUT_DEFAULT: Final[int] = 5
URL_CACHE_TTL_SECONDS: Final[int] = 3600
SAFE_BROWSING_API_URL: Final[str] = (
    "https://safebrowsing.googleapis.com/v4/threatMatches:find"
)
