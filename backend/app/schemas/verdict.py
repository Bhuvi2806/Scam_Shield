"""Pydantic schemas for fused final verdicts and action checklists."""

from typing import Literal
from pydantic import BaseModel, Field


class MergedRedFlag(BaseModel):
    """An individual red flag merged from rule, LLM, or URL detection layers."""

    category: str = Field(
        ...,
        description="Category of the indicator (e.g. urgency, authority_impersonation, suspicious_link, otp_demand)",
    )
    quote: str | None = Field(
        default=None,
        description="Extracted text span or direct quote from the message triggering this red flag",
    )
    start: int | None = Field(
        default=None,
        description="Start character offset in original text for UI highlighting (if known)",
    )
    end: int | None = Field(
        default=None,
        description="End character offset in original text for UI highlighting (if known)",
    )
    reason: str = Field(
        ...,
        description="Human-readable explanation of why this indicator is suspicious or dangerous",
    )
    source: Literal["rule", "llm", "url_local", "url_safe_browsing"] = Field(
        ...,
        description="Detection layer that identified this flag",
    )


class ActionItem(BaseModel):
    """A prioritized action item in the user safety checklist."""

    id: str = Field(..., description="Unique action identifier")
    text_en: str = Field(..., description="Action advice in plain English")
    text_hi: str = Field(..., description="Action advice in Hindi (Devanagari)")
    urgency: Literal["immediate", "important", "info"] = Field(
        default="important",
        description="Urgency tier: immediate (stop/call 1930), important (verify/report), or info",
    )
    link: str | None = Field(
        default=None,
        description="Relevant official web portal link (e.g. https://cybercrime.gov.in)",
    )
    phone: str | None = Field(
        default=None,
        description="Emergency helpline number (e.g. 1930)",
    )


class FinalVerdict(BaseModel):
    """Consolidated final verdict fused across all detection layers."""

    verdict: Literal["safe", "suspicious", "likely_scam"] = Field(
        ...,
        description="Unified categorical risk verdict: safe, suspicious, or likely_scam",
    )
    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Fused risk score between 0 (completely benign) and 100 (high-risk scam)",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score in the final assessment between 0.0 and 1.0",
    )
    scam_type: str = Field(
        default="none",
        description="Identified scam type (e.g. digital_arrest, fake_kyc, upi_refund, none)",
    )
    red_flags: list[MergedRedFlag] = Field(
        default_factory=list,
        description="Merged, de-duplicated red flag indicators with origins and reasons",
    )
    explanation_en: str = Field(
        ...,
        description="Plain-language explanation in English suitable for all age groups",
    )
    explanation_hi: str = Field(
        ...,
        description="Plain-language explanation in Hindi (Devanagari) suitable for all age groups",
    )
    actions: list[ActionItem] = Field(
        default_factory=list,
        description="Prioritized checklist of safety steps (always includes 1930 and cybercrime.gov.in)",
    )
    disclaimer: str = Field(
        ...,
        description="User-facing safety disclaimer; lowest risk carries exact AGENT.md text",
    )
    sources_used: list[str] = Field(
        default_factory=list,
        description="List of detection layers that successfully contributed (e.g. ['rule', 'llm', 'url_check'])",
    )
    degraded: bool = Field(
        default=False,
        description="True if any detection layer was unavailable, skipped, or timed out",
    )
