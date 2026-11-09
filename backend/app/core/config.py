"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for Scam Shield backend."""

    ANTHROPIC_API_KEY: str = ""
    SAFE_BROWSING_API_KEY: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # LLM settings
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    LLM_ENABLED: bool = True
    LLM_TIMEOUT: int = 30  # seconds
    LLM_MAX_TOKENS: int = 1024

    # URL Check & Safe Browsing settings
    URL_CHECK_ENABLED: bool = True
    SAFE_BROWSING_TIMEOUT: int = 5  # seconds

    @property
    def llm_available(self) -> bool:
        """Whether the LLM can actually be used (enabled AND key present)."""
        return self.LLM_ENABLED and bool(self.ANTHROPIC_API_KEY)

    @property
    def safe_browsing_available(self) -> bool:
        """Whether Safe Browsing remote API can be called (enabled AND key present)."""
        return self.URL_CHECK_ENABLED and bool(self.SAFE_BROWSING_API_KEY)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
