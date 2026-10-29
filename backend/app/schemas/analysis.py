"""Pydantic schemas for message analysis requests, red flags, and rule detector results."""

from typing import Literal

from pydantic import BaseModel, Field

from app.core.constants import (
    MAX_TEXT_LENGTH,
)


class RedFlag(BaseModel):
    """An individual scam indicator flagged in the message."""

    pattern_id: str = Field(..., description="ID of the matched pattern, or heuristic rule ID")
    category: str = Field(..., description="Red flag category (urgency, authority impersonation, etc.)")
    matched_text: str = Field(..., description="The exact substring that triggered the indicator")
    start: int = Field(..., ge=0, description="Start character offset in original text for UI highlighting")
    end: int = Field(..., ge=0, description="End character offset in original text for UI highlighting")
    weight: int = Field(..., ge=1, le=5, description="Severity weight from 1 (minor) to 5 (critical)")


class RuleResult(BaseModel):
    """Result of rule-based analysis."""

    score: int = Field(..., ge=0, le=100, description="Overall risk score between 0 (safe) and 100 (scam)")
    verdict: Literal["safe", "suspicious", "likely_scam"] = Field(
        ...,
        description="Categorical risk assessment: safe, suspicious, or likely_scam",
    )
    scam_type_guess: str | None = Field(
        default=None,
        description="Predicted scam type (e.g., 'digital arrest', 'fake KYC'), or None",
    )
    red_flags: list[RedFlag] = Field(
        default_factory=list,
        description="List of detected red flag indicators with character offsets",
    )
    disclaimer: str = Field(
        ...,
        description="Mandatory user-facing safety disclaimer; lowest risk carries exact AGENT.md text",
    )


class AnalyzeRequest(BaseModel):
    """Payload for POST /api/analyze."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_TEXT_LENGTH,
        description="The message text to analyze for scam indicators",
    )
