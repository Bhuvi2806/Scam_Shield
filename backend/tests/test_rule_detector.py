"""Unit tests for the rule-based scam detector."""

from app.core.constants import (
    LOWEST_RISK_DISCLAIMER,
    VERDICT_LIKELY_SCAM,
    VERDICT_SAFE,
    VERDICT_SUSPICIOUS,
)
from app.detectors.rule_detector import RuleDetector
from app.schemas.dataset import VALID_SCAM_TYPES

detector = RuleDetector()


def test_detector_detects_each_scam_type():
    """Each of the 7 supported scam types must trigger a detection and correct type guess."""
    samples = {
        "digital arrest": "CBI Officer: Non-bailable arrest warrant issued. You are placed under digital arrest. Connect on Skype video call.",
        "fake KYC": "Dear Customer, Your SBI account is blocked today due to pending KYC. Update immediately: http://bit.ly/sbi-kyc",
        "UPI refund": "Sir, sent Rs 15000 by mistake to your number. Accept collect request and enter UPI PIN to approve the refund.",
        "job/task scam": "Earn Rs 3000 to 5000 daily from home by liking YouTube videos. Contact receptionist on Telegram: t.me/task_work",
        "lottery/prize": "Congratulations! Your mobile number won 25 Lakh in KBC Lucky Draw 2026. Call KBC manager Rana Pratap Singh.",
        "electricity-bill threat": "Electricity power supply will be disconnected tonight at 9:30 PM due to unpaid bill. Call officer at 98XXXXXXXX.",
        "other": "Traffic Police: Unpaid echallan fine pending. Pay immediately before vehicle impoundment. Download app: http://fine.example.com/app.apk",
    }

    assert set(samples.keys()) == VALID_SCAM_TYPES

    for stype, text in samples.items():
        res = detector.analyze(text)
        assert res.verdict in {VERDICT_SUSPICIOUS, VERDICT_LIKELY_SCAM}, (
            f"Failed to detect scam for {stype}: verdict={res.verdict}"
        )
        assert res.scam_type_guess == stype, (
            f"Expected scam_type_guess '{stype}', got '{res.scam_type_guess}'"
        )
        assert len(res.red_flags) > 0


def test_genuine_messages_not_flagged_as_likely_scam():
    """Legitimate messages with authentic security alerts or utility notices must be safe."""
    genuine_samples = [
        "Your SBI OTP for login is 839201. Valid for 10 mins. Do not share this OTP with anyone, including bank staff.",
        "Alert: Rs 5,000.00 credited to your HDFC bank account XXXXXXXX via NEFT on 27-OCT-2026. Net available balance: INR 23,800.00.",
        "Your Amazon package with tracking XXXXXXXX is out for delivery today. Share delivery verification code 3819 at doorstep.",
        "Dear Consumer XXXXXXXX, your electricity bill of Rs 1,420 for billing month OCT-2026 is due on 15-NOV-2026. Pay safely at official portal mahadiscom.in.",
        "Dear customer, per RBI guidelines, please update your KYC periodically by visiting your nearest home branch. Bank never asks for OTP, PIN or CVV.",
        "Govt of India cyber safety awareness: Never share OTP, UPI PIN, or bank passwords with anyone. Report cyber fraud at 1930 or cybercrime.gov.in.",
    ]

    for text in genuine_samples:
        res = detector.analyze(text)
        assert res.verdict == VERDICT_SAFE, (
            f"Genuine message incorrectly flagged as {res.verdict}: '{text[:50]}...'"
        )
        assert res.score < 30


def test_red_flag_offsets_point_to_exact_text():
    """RedFlag start and end character offsets must map to the matched substring in original text."""
    text = "CBI Officer: Non-bailable arrest warrant issued. Download app at http://bit.ly/sbi-verify"
    res = detector.analyze(text)

    assert len(res.red_flags) > 0
    for flag in res.red_flags:
        extracted = text[flag.start : flag.end]
        assert extracted.lower() == flag.matched_text.lower(), (
            f"Offset mismatch for {flag.pattern_id}: expected '{flag.matched_text}', got '{extracted}'"
        )


def test_negation_and_protective_context_handling():
    """Protective warnings must prevent flagging, while malicious demands must be caught."""
    # Protective warnings -> Safe
    safe_alert = "Your OTP is 492018. Do not share this OTP with anyone, including bank employees."
    safe_res = detector.analyze(safe_alert)
    assert safe_res.verdict == VERDICT_SAFE

    safe_hindi = "सुरक्षा कारणों से कृपया अपना ओटीपी या पासवर्ड किसी के साथ साझा न करें।"
    safe_hi_res = detector.analyze(safe_hindi)
    assert safe_hi_res.verdict == VERDICT_SAFE

    # Scam demands -> Likely Scam
    scam_demand = "Account blocked. Share your 6-digit OTP with our bank verification executive to unblock."
    scam_res = detector.analyze(scam_demand)
    assert scam_res.verdict == VERDICT_LIKELY_SCAM
    assert any(f.category == "OTP/PIN/CVV demand" for f in scam_res.red_flags)


def test_empty_input_returns_safe_with_disclaimer():
    """Empty or whitespace input must return score 0, verdict safe, and exact lowest-risk disclaimer."""
    for empty_val in ["", "   ", "\n\t"]:
        res = detector.analyze(empty_val)
        assert res.score == 0
        assert res.verdict == VERDICT_SAFE
        assert res.scam_type_guess is None
        assert res.red_flags == []
        assert res.disclaimer == LOWEST_RISK_DISCLAIMER


def test_very_long_input_handled_gracefully():
    """A long message (several thousand characters) must be analyzed without errors."""
    long_prefix = "This is a legitimate regular narrative text. " * 150
    malicious_text = (
        long_prefix
        + " Non-bailable arrest warrant issued by CBI. Connect on Skype video call."
    )
    res = detector.analyze(malicious_text)
    assert res.verdict == VERDICT_LIKELY_SCAM
    assert res.scam_type_guess == "digital arrest"


def test_disclaimer_present_on_safe_verdict():
    """The lowest-risk verdict must carry the exact wording mandated by AGENT.md Section 5."""
    res = detector.analyze("Hello, are we still meeting tomorrow for lunch?")
    assert res.verdict == VERDICT_SAFE
    assert (
        res.disclaimer
        == "No red flag found, but never share OTP, PIN or money with anyone who contacts you."
    )


def test_local_url_heuristics():
    """Local URL heuristics detect APKs, IP hosts, shorteners, and deceptive domains."""
    # 1. APK link
    apk_res = detector.analyze(
        "Direct link to update: http://example.com/files/bank_support.apk"
    )
    assert any(f.pattern_id == "HEUR-URL-APK" for f in apk_res.red_flags)

    # 2. IP address host
    ip_res = detector.analyze("Access your secure portal at http://192.168.1.100/login")
    assert any(f.pattern_id == "HEUR-URL-IP" for f in ip_res.red_flags)

    # 3. URL shortener
    short_res = detector.analyze(
        "View your pending order status: https://bit.ly/tracking-id"
    )
    assert any(f.pattern_id == "HEUR-URL-SHORTENER" for f in short_res.red_flags)

    # 4. Deceptive look-alike domain
    deceptive_res = detector.analyze(
        "Access portal at http://hdfc-netbanking-portal.com"
    )
    assert any(f.pattern_id == "HEUR-URL-DECEPTIVE" for f in deceptive_res.red_flags)

    # 5. Legitimate government domain not flagged as deceptive
    gov_res = detector.analyze("Official grievance portal at https://cybercrime.gov.in")
    assert not any(f.pattern_id.startswith("HEUR-URL") for f in gov_res.red_flags)
