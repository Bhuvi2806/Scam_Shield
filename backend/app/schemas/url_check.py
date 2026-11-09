"""Pydantic schemas for URL checking and Safe Browsing integration."""

from typing import Literal

from pydantic import BaseModel, Field


class UrlFinding(BaseModel):
    """An individual URL evaluation finding."""

    url: str = Field(
        ...,
        description="Defanged URL for safe display (e.g. hxxps://example[.]com)",
    )
    source: Literal["local", "safe_browsing"] = Field(
        ...,
        description="Source of the finding: local heuristic or Google Safe Browsing",
    )
    status: Literal["clean", "suspicious", "malicious", "unchecked"] = Field(
        ...,
        description="Verdict status for this specific URL finding",
    )
    reasons: list[str] = Field(
        default_factory=list,
        description="List of specific indicator reasons (e.g. url_shortener, apk_download, ip_host, lookalike_domain, safe_browsing:MALWARE)",
    )


class UrlCheckResult(BaseModel):
    """Aggregated URL check result for a message."""

    findings: list[UrlFinding] = Field(
        default_factory=list,
        description="List of findings across all detected URLs in the message",
    )
    overall_status: Literal["clean", "suspicious", "malicious", "unchecked"] = Field(
        default="clean",
        description="Worst-case overall verdict across all extracted URLs",
    )
    error: str | None = Field(
        default=None,
        description="Controlled error message if Safe Browsing lookup was unavailable or failed",
    )
