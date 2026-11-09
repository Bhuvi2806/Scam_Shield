"""LLM-based scam message analyzer.

Calls the LLM client, parses the response as JSON, and validates it
against the LLMResult Pydantic schema. Retries once on invalid JSON
or schema failure. Raises controlled errors on timeout or API failure.

Privacy: never logs message text or model response body — only status,
latency, and error type.
"""

from __future__ import annotations

import json
import logging
import time

from pydantic import ValidationError

from app.llm.client import LLMAPIError, LLMClient, LLMTimeoutError
from app.llm.prompts import SYSTEM_PROMPT, build_user_prompt
from app.schemas.llm import LLMResult

logger = logging.getLogger(__name__)

MAX_RETRIES = 1  # Retry once on parse/validation failure


class LLMAnalysisError(Exception):
    """Controlled error raised when LLM analysis fails after retries."""


def _parse_llm_response(raw_text: str) -> LLMResult:
    """Parse and validate the raw LLM text response into an LLMResult.

    Strips markdown code fences if present, then parses JSON and validates.

    Raises:
        LLMAnalysisError: on invalid JSON or schema validation failure
    """
    cleaned = raw_text.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first line (```json or ```) and last line (```)
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        cleaned = "\n".join(lines).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise LLMAnalysisError(f"Invalid JSON from LLM: {type(exc).__name__}") from exc

    try:
        return LLMResult.model_validate(data)
    except ValidationError as exc:
        raise LLMAnalysisError(
            f"LLM response failed schema validation: {exc.error_count()} error(s)"
        ) from exc


def analyze_with_llm(text: str, client: LLMClient) -> LLMResult:
    """Analyze a message using the LLM and return a validated LLMResult.

    Args:
        text: The message text to analyze.
        client: An LLMClient instance (real or fake for testing).

    Returns:
        A validated LLMResult.

    Raises:
        LLMAnalysisError: on persistent parse/validation failure or API error.

    Privacy: never logs the message text or the model's response body.
    """
    user_prompt = build_user_prompt(text)
    last_error: Exception | None = None

    for attempt in range(1 + MAX_RETRIES):
        start_time = time.monotonic()
        try:
            raw_response = client.generate(SYSTEM_PROMPT, user_prompt)
            elapsed = time.monotonic() - start_time
            logger.info(
                "LLM call completed in %.2fs (attempt %d)", elapsed, attempt + 1
            )

            result = _parse_llm_response(raw_response)
            return result

        except (LLMTimeoutError, LLMAPIError) as exc:
            elapsed = time.monotonic() - start_time
            logger.warning(
                "LLM API failure (attempt %d, %.2fs): %s",
                attempt + 1,
                elapsed,
                type(exc).__name__,
            )
            raise LLMAnalysisError(f"LLM API failure: {type(exc).__name__}") from exc

        except LLMAnalysisError as exc:
            elapsed = time.monotonic() - start_time
            last_error = exc
            if attempt < MAX_RETRIES:
                logger.warning(
                    "LLM parse/validation failed (attempt %d, %.2fs), retrying: %s",
                    attempt + 1,
                    elapsed,
                    str(exc),
                )
            else:
                logger.warning(
                    "LLM parse/validation failed after %d attempt(s) (%.2fs): %s",
                    attempt + 1,
                    elapsed,
                    str(exc),
                )

    # Should not reach here, but just in case
    raise LLMAnalysisError(f"LLM analysis failed after retries: {last_error}")
