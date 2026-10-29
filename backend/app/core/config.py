"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for Scam Shield backend."""

    ANTHROPIC_API_KEY: str = ""
    SAFE_BROWSING_API_KEY: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
