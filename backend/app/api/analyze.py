"""FastAPI route for message analysis adhering to strict in-memory privacy rules.

Returns rule-based, LLM, and URL check results.
Runs LLM and Safe Browsing URL analysis concurrently via asyncio.
If LLM or Safe Browsing fails or is disabled, rule detection is always preserved.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.detectors.rule_detector import RuleDetector
from app.detectors.url_checker import (
    GoogleSafeBrowsingClient,
    SafeBrowsingClient,
    SafeBrowsingError,
    UrlChecker,
)
from app.llm.analyzer import LLMAnalysisError, analyze_with_llm
from app.llm.client import ClaudeLLMClient, LLMAPIError
from app.schemas.analysis import AnalyzeRequest, RuleResult
from app.schemas.llm import LLMResult
from app.schemas.url_check import UrlCheckResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])
detector = RuleDetector()

# Singleton UrlChecker instance to preserve in-memory TTL cache across requests
_url_checker_instance = UrlChecker()


class AnalyzeResponse(BaseModel):
    """Combined response from rule-based, LLM, and URL check analysis."""

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
    url_check: UrlCheckResult | None = Field(
        default=None,
        description="URL check result (null if URL checking is disabled)",
    )


def _get_llm_client() -> ClaudeLLMClient | None:
    """Create an LLM client if configured and available, or return None."""
    if not settings.llm_available:
        return None
    try:
        return ClaudeLLMClient()
    except LLMAPIError as exc:
        logger.warning("Could not create LLM client: %s", type(exc).__name__)
        return None


def _get_safe_browsing_client() -> SafeBrowsingClient | None:
    """Create a Google Safe Browsing client if configured, or return None."""
    if not settings.safe_browsing_available:
        return None
    try:
        return GoogleSafeBrowsingClient()
    except SafeBrowsingError as exc:
        logger.warning("Could not create Safe Browsing client: %s", type(exc).__name__)
        return None


async def _run_llm_analysis(
    text: str, client: ClaudeLLMClient
) -> tuple[LLMResult | None, str | None]:
    """Execute LLM analysis in a thread to prevent blocking event loop."""
    try:
        result = await asyncio.to_thread(analyze_with_llm, text, client)
        return result, None
    except LLMAnalysisError as exc:
        logger.warning("LLM analysis failed: %s", type(exc).__name__)
        return None, str(exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error during LLM analysis: %s", type(exc).__name__)
        return None, f"Unexpected LLM error: {type(exc).__name__}"


async def _run_url_analysis(
    text: str, checker: UrlChecker, sb_client: SafeBrowsingClient | None
) -> UrlCheckResult | None:
    """Execute URL checking (local heuristics + Safe Browsing lookup) in a thread."""
    try:
        # Dynamically attach current client
        checker._client = sb_client
        return await asyncio.to_thread(checker.check_text, text)
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error during URL check: %s", type(exc).__name__)
        return UrlCheckResult(
            findings=[],
            overall_status="unchecked",
            error=f"Unexpected URL check error: {type(exc).__name__}",
        )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze a message for scam indicators",
    description=(
        "Analyzes input text using rule patterns, heuristics, optional LLM, "
        "and Google Safe Browsing URL intelligence. Concurrently executed and processed in-memory."
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

    # 1. Rule-based analysis (always runs in-memory synchronously)
    rule_result = detector.analyze(text)

    # 2. Concurrently execute LLM and URL checks
    llm_client = _get_llm_client()
    sb_client = _get_safe_browsing_client()

    llm_task = None
    if llm_client is not None:
        llm_task = _run_llm_analysis(text, llm_client)

    url_task = None
    if settings.URL_CHECK_ENABLED:
        url_task = _run_url_analysis(text, _url_checker_instance, sb_client)

    # Run tasks concurrently
    llm_result: LLMResult | None = None
    llm_error: str | None = None
    url_check: UrlCheckResult | None = None

    if llm_task and url_task:
        (llm_res, llm_err), url_res = await asyncio.gather(llm_task, url_task)
        llm_result, llm_error = llm_res, llm_err
        url_check = url_res
    elif llm_task:
        llm_result, llm_error = await llm_task
    elif url_task:
        url_check = await url_task

    return AnalyzeResponse(
        rule=rule_result,
        llm=llm_result,
        llm_error=llm_error,
        url_check=url_check,
    )
