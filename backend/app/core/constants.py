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

# Fusion Weights (must sum to 1.0)
FUSION_WEIGHT_RULE: Final[float] = 0.35
FUSION_WEIGHT_LLM: Final[float] = 0.40
FUSION_WEIGHT_URL: Final[float] = 0.25

FUSION_WEIGHT_RULE_NO_URL: Final[float] = 0.45
FUSION_WEIGHT_LLM_NO_URL: Final[float] = 0.55

FUSION_WEIGHT_RULE_NO_LLM: Final[float] = 0.65
FUSION_WEIGHT_URL_NO_LLM: Final[float] = 0.35

# Fusion Score Bands & Thresholds
FUSION_SCORE_THRESHOLD_SAFE: Final[int] = 25
FUSION_SCORE_THRESHOLD_LIKELY_SCAM: Final[int] = 60
FUSION_CAP_LLM_ONLY_SCORE: Final[int] = 55
FUSION_MALICIOUS_MIN_SCORE: Final[int] = 85

# Synthetic Layer Scores
URL_SCORE_MALICIOUS: Final[int] = 95
URL_SCORE_SUSPICIOUS: Final[int] = 50
URL_SCORE_CLEAN: Final[int] = 0

LLM_SCORE_LIKELY_SCAM: Final[int] = 85
LLM_SCORE_SUSPICIOUS: Final[int] = 50
LLM_SCORE_SAFE: Final[int] = 10

# Confidence Limits
MAX_CONFIDENCE_CAP: Final[float] = 0.95
CONFIDENCE_HIGH: Final[float] = 0.90
CONFIDENCE_MEDIUM: Final[float] = 0.70
CONFIDENCE_LOW: Final[float] = 0.50
CONFIDENCE_DEGRADED_PENALTY: Final[float] = 0.15
