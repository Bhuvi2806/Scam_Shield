"""Pydantic schemas for scam patterns and labelled evaluation datasets."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

VALID_SCAM_TYPES = {
    "digital arrest",
    "fake KYC",
    "UPI refund",
    "job/task scam",
    "lottery/prize",
    "electricity-bill threat",
    "other",
}


class Pattern(BaseModel):
    """A rule pattern used to detect scam indicators in messages."""

    id: str = Field(..., description="Unique identifier for the pattern, e.g. PAT-001")
    scam_type: str = Field(..., description="Type of scam this pattern indicates")
    name: str = Field(..., description="Short descriptive name of the pattern")
    description: str = Field(
        ..., description="Detailed description of what this pattern catches"
    )
    keywords_en: list[str] = Field(
        default_factory=list, description="English keywords or phrases"
    )
    keywords_hi: list[str] = Field(
        default_factory=list,
        description="Hindi keywords or phrases in Devanagari script and Hinglish transliteration",
    )
    regexes: list[str] = Field(
        default_factory=list, description="Regex patterns for matching"
    )
    red_flag_category: str = Field(
        ...,
        description="High-level category of red flag, e.g. urgency, authority impersonation, OTP demand",
    )
    weight: int = Field(
        ..., ge=1, le=5, description="Severity weight from 1 (minor) to 5 (critical)"
    )

    @field_validator("scam_type")
    @classmethod
    def validate_scam_type(cls, value: str) -> str:
        if value not in VALID_SCAM_TYPES:
            raise ValueError(
                f"Invalid scam_type '{value}'. Must be one of {sorted(VALID_SCAM_TYPES)}"
            )
        return value


class TestMessage(BaseModel):
    """A labelled synthetic test message for detector evaluation."""

    id: str = Field(..., description="Unique message identifier, e.g. MSG-001")
    text: str = Field(..., description="Full message text")
    language: Literal["en", "hi", "hinglish"] = Field(
        ..., description="Language of the message"
    )
    label: Literal["scam", "genuine"] = Field(
        ..., description="Classification ground truth"
    )
    scam_type: str | None = Field(
        default=None,
        description="Scam category if label is 'scam', or None if 'genuine'",
    )
    notes: str = Field(
        default="", description="Contextual notes on why this is scam or genuine"
    )

    @field_validator("scam_type")
    @classmethod
    def validate_scam_type(cls, value: str | None, info) -> str | None:
        label = info.data.get("label")
        if label == "genuine" and value is not None:
            raise ValueError("Genuine messages must have scam_type=None")
        if label == "scam":
            if not value:
                raise ValueError("Scam messages must have a non-empty scam_type")
            if value not in VALID_SCAM_TYPES:
                raise ValueError(
                    f"Invalid scam_type '{value}'. Must be one of {sorted(VALID_SCAM_TYPES)}"
                )
        return value
