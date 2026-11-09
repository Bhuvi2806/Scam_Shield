"""LLM client abstraction and Claude (Anthropic) implementation.

The abstract LLMClient interface allows tests to inject a fake client
without ever calling the real API.
"""

from __future__ import annotations

import abc
import logging

import anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMClient(abc.ABC):
    """Abstract interface for an LLM text-generation client."""

    @abc.abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Send a prompt and return the raw text response.

        Raises:
            LLMTimeoutError: on request timeout
            LLMAPIError: on any other API-level failure
        """


class LLMTimeoutError(Exception):
    """Raised when the LLM API request times out."""


class LLMAPIError(Exception):
    """Raised when the LLM API returns an error."""


class ClaudeLLMClient(LLMClient):
    """Thin wrapper around the Anthropic Python SDK."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: int | None = None,
        max_tokens: int | None = None,
    ) -> None:
        self._api_key = api_key or settings.ANTHROPIC_API_KEY
        self._model = model or settings.ANTHROPIC_MODEL
        self._timeout = timeout or settings.LLM_TIMEOUT
        self._max_tokens = max_tokens or settings.LLM_MAX_TOKENS

        if not self._api_key:
            raise LLMAPIError("ANTHROPIC_API_KEY is not set")

        self._client = anthropic.Anthropic(
            api_key=self._api_key,
            timeout=self._timeout,
        )

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Call Claude and return the text content of the first response block.

        Privacy: never logs the prompt or response body — only status and latency.
        """
        try:
            message = self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            # Extract the text content from the first content block
            if message.content and len(message.content) > 0:
                return message.content[0].text
            raise LLMAPIError("Empty response from Claude API")

        except anthropic.APITimeoutError as exc:
            logger.warning("LLM request timed out (timeout=%ds)", self._timeout)
            raise LLMTimeoutError(f"Claude API timed out after {self._timeout}s") from exc

        except anthropic.APIError as exc:
            logger.warning("LLM API error: %s", type(exc).__name__)
            raise LLMAPIError(f"Claude API error: {type(exc).__name__}") from exc
