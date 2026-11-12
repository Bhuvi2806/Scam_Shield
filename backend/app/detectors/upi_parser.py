"""Parser and fraud detector for NPCI UPI payment deep links (upi://pay).

In India's Unified Payments Interface (UPI):
1. Scanning a QR code or entering a UPI PIN is ALWAYS a DEBIT (SEND) operation.
2. A payee NEVER needs to scan a QR code or enter a PIN to RECEIVE funds.
3. Common scam pattern: Fraudsters send a payment QR claiming it is a 'Refund Voucher',
   'Cashback Voucher', or 'Army Advance', tricking victims into authorizing a debit.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

from app.schemas.qr import QRRedFlag, UPIPayload

# Common deceptive phrases in transaction notes used by QR scammers
_DECEPTIVE_NOTE_PATTERNS = [
    (
        re.compile(
            r"\b(refund|cashback|reward|bonus|prize|lottery|claim)\b", re.IGNORECASE
        ),
        "Deceptive 'Refund / Cashback' note in a debit QR code. Scanning will deduct money, NOT credit it.",
    ),
    (
        re.compile(r"\b(receive|credit|accept|claim\s*money)\b", re.IGNORECASE),
        "Claims to 'receive' or 'credit' money via QR. In UPI, scanning is strictly for paying.",
    ),
    (
        re.compile(
            r"\b(army|canteen|bsf|crpf|defense|defence|officer)\b", re.IGNORECASE
        ),
        "Suspected Army/Defense Canteen impersonation scam in transaction note.",
    ),
    (
        re.compile(r"\b(kyc|verification|unblock|penalty|fine)\b", re.IGNORECASE),
        "Claims to be a 'KYC / Verification' fee in transaction note.",
    ),
    (
        re.compile(r"\b(olx|quikr|buyer|advance)\b", re.IGNORECASE),
        "Suspected marketplace/OLX buyer advance payment trap.",
    ),
]

# Impersonation keywords in payee name (pn)
_IMPERSONATION_NAME_PATTERNS = [
    (
        re.compile(
            r"\b(customer\s*care|helpdesk|support|sbi|hdfc|icici|paytm|phonepe|gpay|google\s*pay|electricity\s*board|cyber\s*crime)\b",
            re.IGNORECASE,
        ),
        "Payee name impersonates a financial institution, utility, or support desk.",
    ),
]

_VPA_REGEX = re.compile(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$")


def parse_upi_uri(uri: str) -> tuple[UPIPayload | None, list[QRRedFlag], int]:
    """Parse a upi://pay URI and evaluate for scam indicators.

    Returns:
        tuple of (parsed UPIPayload, list of QRRedFlag indicators, risk score 0-100).
    """
    if not uri.lower().startswith("upi://pay"):
        return None, [], 0

    parsed = urlparse(uri)
    params = parse_qs(parsed.query)

    def get_single(key: str) -> str | None:
        val = params.get(key)
        return val[0].strip() if val and val[0].strip() else None

    pa = get_single("pa")
    if not pa:
        return (
            None,
            [
                QRRedFlag(
                    category="Malformed UPI URI",
                    reason="UPI payment URI is missing the mandatory payee address (pa).",
                    severity="suspicious",
                )
            ],
            40,
        )

    pn = get_single("pn")
    am_str = get_single("am")
    tn = get_single("tn")
    mc = get_single("mc")
    tr = get_single("tr")
    cu = get_single("cu") or "INR"

    amount: float | None = None
    if am_str:
        try:
            amount = float(am_str)
        except ValueError:
            amount = None

    is_valid_vpa = bool(_VPA_REGEX.match(pa))

    payload = UPIPayload(
        payee_vpa=pa,
        payee_name=pn,
        amount=amount,
        currency=cu,
        transaction_note=tn,
        merchant_code=mc,
        transaction_ref_id=tr,
        is_valid_vpa=is_valid_vpa,
    )

    red_flags: list[QRRedFlag] = []
    score = 0

    # 1. Check VPA validity
    if not is_valid_vpa:
        red_flags.append(
            QRRedFlag(
                category="Suspicious VPA Format",
                reason=f"The payee address '{pa}' does not conform to valid UPI VPA structure.",
                severity="high",
            )
        )
        score += 35

    # 2. Check deceptive transaction notes (tn)
    if tn:
        for pattern, reason in _DECEPTIVE_NOTE_PATTERNS:
            if pattern.search(tn):
                red_flags.append(
                    QRRedFlag(
                        category="UPI Scan-to-Receive Trap",
                        reason=reason,
                        severity="critical",
                    )
                )
                score = max(score, 85)

    # 3. Check authority / corporate impersonation in payee name (pn)
    if pn:
        for pattern, reason in _IMPERSONATION_NAME_PATTERNS:
            if pattern.search(pn):
                red_flags.append(
                    QRRedFlag(
                        category="Payee Authority Impersonation",
                        reason=f"{reason} Payee claims to be '{pn}'.",
                        severity="high",
                    )
                )
                score = max(score, 75)

    # 4. Inherent UPI Risk Assessment:
    # Any UPI QR code that requests money has an inherent warning if someone was told they would "receive" money.
    if (
        amount
        and amount > 0
        and any(rf.category == "UPI Scan-to-Receive Trap" for rf in red_flags)
    ):
        red_flags.append(
            QRRedFlag(
                category="Preset Debit Amount",
                reason=f"This QR code will immediately deduct ₹{amount:,.2f} from your bank account upon PIN entry.",
                severity="critical",
            )
        )
        score = max(score, 90)

    # Cap score between 0 and 100
    score = min(max(score, 0), 100)

    return payload, red_flags, score
