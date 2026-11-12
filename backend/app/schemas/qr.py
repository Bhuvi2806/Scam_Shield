"""Schemas for QR code detection and UPI fraud analysis."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class UPIPayload(BaseModel):
    """Parsed UPI payment URI parameters (NPCI UPI Deep Link specification)."""

    payee_vpa: str = Field(
        ..., description="Virtual Payment Address / UPI ID (pa parameter)"
    )
    payee_name: str | None = Field(
        default=None, description="Payee display name (pn parameter)"
    )
    amount: float | None = Field(
        default=None, description="Transaction amount (am parameter)"
    )
    currency: str = Field(default="INR", description="Currency code (cu parameter)")
    transaction_note: str | None = Field(
        default=None, description="Transaction reference note (tn parameter)"
    )
    merchant_code: str | None = Field(
        default=None, description="Merchant category code (mc parameter)"
    )
    transaction_ref_id: str | None = Field(
        default=None, description="Transaction reference ID (tr parameter)"
    )
    is_valid_vpa: bool = Field(
        default=True,
        description="Whether the payee VPA follows valid username@bank format",
    )


class QRRedFlag(BaseModel):
    """Specific fraud indicator identified inside QR code payload."""

    category: str = Field(
        ..., description="Category of red flag (e.g. 'UPI Scan-to-Receive Trap')"
    )
    reason: str = Field(
        ..., description="Explanation of why this indicator is dangerous"
    )
    severity: Literal["high", "critical", "suspicious"] = Field(
        ..., description="Severity level"
    )


class QRResult(BaseModel):
    """Result of QR code detection and threat analysis."""

    found: bool = Field(..., description="Whether a QR code was detected in the image")
    raw_text: str | None = Field(
        default=None, description="Raw decoded text from QR code"
    )
    qr_type: Literal["upi", "url", "text", "none"] = Field(
        default="none", description="Payload classification"
    )
    upi_payload: UPIPayload | None = Field(
        default=None, description="Parsed UPI details if upi://pay URI"
    )
    verdict: Literal["safe", "suspicious", "likely_scam"] = Field(
        default="safe", description="Threat verdict"
    )
    score: int = Field(default=0, ge=0, le=100, description="Risk score 0-100")
    red_flags: list[QRRedFlag] = Field(
        default_factory=list, description="Specific threat findings"
    )
    safety_rule_en: str = Field(
        default=(
            "In India's UPI system, scanning a QR code or entering your UPI PIN is ONLY for SENDING money. "
            "You NEVER need to scan a QR code or enter a PIN to receive money."
        ),
        description="Core UPI safety rule in English",
    )
    safety_rule_hi: str = Field(
        default=(
            "भारत के UPI सिस्टम में, QR कोड स्कैन करना या UPI PIN डालना केवल पैसे भेजने के लिए होता है। "
            "पैसे प्राप्त करने के लिए कभी भी QR कोड स्कैन करने या PIN डालने की आवश्यकता नहीं होती।"
        ),
        description="Core UPI safety rule in Hindi",
    )
    warnings: list[str] = Field(
        default_factory=list, description="Processing warnings or cautions"
    )
