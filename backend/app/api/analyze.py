"""FastAPI route for message analysis adhering to strict in-memory privacy rules.

Returns both rule-based and LLM results. The LLM result is optional:
if it fails or is disabled, the rule result is still returned (graceful fallback).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.detectors.rule_detector import RuleDetector
from app.llm.analyzer import LLMAnalysisError, analyze_with_llm
from app.llm.client import ClaudeLLMClient, LLMAPIError
from app.schemas.analysis import AnalyzeRequest, RuleResult
from app.schemas.llm import LLMResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])
detector = RuleDetector()


class AnalyzeResponse(BaseModel):
    """Combined response from rule-based and LLM analysis."""

    rule: RuleResult = Field(
        ..., description="Rule-based analysis result (always present)"
    )
    llm: LLMResult | None = Field(
        default=None,
        description="LLM analysis result (null if LLM disabled, unavailable, or failed)",
    )
    llm_error: str | None = Field(
        default=None,
        description="Error description if LLM analysis failed (null on success or if disabled)",
    )


def _get_llm_client() -> ClaudeLLMClient | None:
    """Create an LLM client if available, or return None."""
    if not settings.llm_available:
        return None
    try:
        return ClaudeLLMClient()
    except LLMAPIError as exc:
        logger.warning("Could not create LLM client: %s", type(exc).__name__)
        return None


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze a message for scam indicators",
    description=(
        "Analyzes input text using rule patterns, heuristics, and optionally the LLM. "
        "Processed in-memory; never stored or logged."
    ),
)
async def analyze_message(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze a suspicious message in memory without storing or logging message content."""
    text = request.text
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Message text cannot be empty or whitespace only.",
        )

    # Rule-based analysis (always runs)
    rule_result = detector.analyze(text)

    # LLM analysis (optional — graceful fallback on failure)
    llm_result: LLMResult | None = None
    llm_error: str | None = None

    client = _get_llm_client()
    if client is not None:
        try:
            llm_result = analyze_with_llm(text, client)
        except LLMAnalysisError as exc:
            llm_error = str(exc)
            logger.warning(
                "LLM analysis failed, returning rule-only result: %s",
                type(exc).__name__,
            )

    return AnalyzeResponse(rule=rule_result, llm=llm_result, llm_error=llm_error)
