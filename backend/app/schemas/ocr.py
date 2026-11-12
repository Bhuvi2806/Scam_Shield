"""Pydantic schemas for screenshot OCR extraction and language detection."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.qr import QRResult


class OCRResult(BaseModel):
    """Result of OCR extraction from an uploaded screenshot."""

    text: str = Field(
        ...,
        description="Extracted and normalized plain text from the screenshot",
    )
    language_guess: Literal["en", "hi", "hinglish"] = Field(
        ...,
        description="Guessed dominant language or script blend of the extracted message",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Aggregate OCR confidence score between 0.0 and 1.0",
    )
    low_confidence: bool = Field(
        ...,
        description="True if confidence is below threshold or extraction is fragmented",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Advisory notes (e.g. low resolution, blurred text, non-standard fonts)",
    )
    qr_result: QRResult | None = Field(
        default=None,
        description="Detailed QR code scan and UPI fraud analysis if a QR code was detected in the image",
    )
