"""Schemas for LLM analysis results."""

from pydantic import BaseModel, Field


class LLMRedFlag(BaseModel):
    """A single red flag identified by the LLM."""

    category: str = Field(
        ...,
        description="Red flag category (e.g. urgency, authority_impersonation, otp_demand, money_demand, suspicious_link, stay_on_call, threats, too_good_to_be_true)",
    )
    quote: str = Field(
        ...,
        description="Short direct quote from the message that triggered this flag",
    )
    reason: str = Field(
        ...,
        description="Brief explanation of why this is a red flag",
    )


class LLMResult(BaseModel):
    """Structured result from LLM scam analysis."""

    verdict: str = Field(
        ...,
        pattern=r"^(safe|suspicious|likely_scam)$",
        description="One of: safe, suspicious, likely_scam",
    )
    scam_type: str = Field(
        ...,
        pattern=r"^(digital_arrest|fake_kyc|upi_refund|job_task_scam|lottery_prize|electricity_bill_threat|other|none)$",
        description="Detected scam type or 'none'",
    )
    red_flags: list[LLMRedFlag] = Field(
        default_factory=list,
        description="List of red flags found in the message",
    )
    explanation_en: str = Field(
        ...,
        min_length=1,
        description="Plain English explanation, simple enough for an elderly person",
    )
    explanation_hi: str = Field(
        ...,
        min_length=1,
        description="Plain Hindi (Devanagari) explanation, simple enough for an elderly person",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0 and 1",
    )
