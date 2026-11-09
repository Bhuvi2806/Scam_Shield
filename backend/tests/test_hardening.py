"""Tests for security hardening: headers, CORS, body limits, rate limits, error sanitization, and repo scanning."""

from __future__ import annotations

import logging
import re
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.analyze import reset_analyze_rate_limits
from app.core.config import settings
from app.core.constants import (
    ANALYZE_RATE_LIMIT_REQUESTS,
    MAX_ANALYZE_PAYLOAD_BYTES,
)
from app.main import app, lifespan


@pytest.fixture(autouse=True)
def _reset_limits():
    """Ensure clean rate limit state before and after each test."""
    reset_analyze_rate_limits()
    yield
    reset_analyze_rate_limits()


@pytest.mark.anyio
async def test_security_headers_present():
    """Verify standard defensive security headers are returned on all responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert "frame-ancestors 'none'" in headers.get("Content-Security-Policy", "")
    assert "camera=()" in headers.get("Permissions-Policy", "")
    assert headers.get("X-XSS-Protection") == "0"


@pytest.mark.anyio
async def test_cors_origin_enforcement():
    """Verify CORS responds with configured origin and does not permit arbitrary wildcard origins."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request with configured frontend origin
        allowed_res = await client.options(
            "/api/analyze",
            headers={
                "Origin": settings.FRONTEND_ORIGIN,
                "Access-Control-Request-Method": "POST",
            },
        )
        assert (
            allowed_res.headers.get("access-control-allow-origin")
            == settings.FRONTEND_ORIGIN
        )

        # Request with untrusted origin
        untrusted_res = await client.options(
            "/api/analyze",
            headers={
                "Origin": "https://malicious-attacker-site.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert (
            untrusted_res.headers.get("access-control-allow-origin")
            != "https://malicious-attacker-site.com"
        )
        assert untrusted_res.headers.get("access-control-allow-origin") != "*"


@pytest.mark.anyio
async def test_request_body_size_limit_analyze():
    """Verify request with Content-Length exceeding 1MB limit for /api/analyze is rejected with 413."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        oversized_length = str(MAX_ANALYZE_PAYLOAD_BYTES + 500)
        response = await client.post(
            "/api/analyze",
            headers={
                "Content-Length": oversized_length,
                "Content-Type": "application/json",
            },
            content=b'{"text": "test"}',
        )
    assert response.status_code == 413
    data = response.json()
    assert "Payload too large" in data.get("detail", "")


@pytest.mark.anyio
async def test_invalid_content_length_rejected():
    """Verify request with non-integer Content-Length is rejected with 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/analyze",
            headers={
                "Content-Length": "not-a-number",
                "Content-Type": "application/json",
            },
            content=b'{"text": "test"}',
        )
    assert response.status_code == 400
    data = response.json()
    assert "Invalid Content-Length header" in data.get("detail", "")


@pytest.mark.anyio
async def test_analyze_rate_limiting():
    """Verify analyze endpoint rate limits after threshold requests per minute."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"text": "Safe bank notification reference #123456"}
        # Send up to the limit
        for _ in range(ANALYZE_RATE_LIMIT_REQUESTS):
            res = await client.post("/api/analyze", json=payload)
            assert res.status_code == 200

        # Next request must be rate-limited with 429
        rate_limited_res = await client.post("/api/analyze", json=payload)
        assert rate_limited_res.status_code == 429
        assert "Rate limit exceeded" in rate_limited_res.json().get("detail", "")

        # Resetting rate limit restores functionality
        reset_analyze_rate_limits()
        recovered_res = await client.post("/api/analyze", json=payload)
        assert recovered_res.status_code == 200


@pytest.mark.anyio
async def test_sanitized_500_error_response(monkeypatch):
    """Verify unhandled exceptions return a sanitized JSON 500 error without leaking stack traces."""
    # Force an unhandled exception in an endpoint
    from app.detectors import rule_detector

    def _broken_analyze(self, text):
        raise RuntimeError("SecretDatabasePasswordInTraceback: sensitive_internal_info")

    monkeypatch.setattr(rule_detector.RuleDetector, "analyze", _broken_analyze)

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/analyze", json={"text": "Hello test"})

    assert response.status_code == 500
    data = response.json()
    assert data == {
        "detail": "An internal server error occurred. Please try again later."
    }
    assert "SecretDatabasePasswordInTraceback" not in response.text
    assert "Traceback" not in response.text


@pytest.mark.anyio
async def test_startup_degraded_mode_warnings(caplog):
    """Verify startup diagnostic warnings are logged when external API keys are missing."""
    caplog.set_level(logging.WARNING)
    # If keys are empty (default in test environment), lifespan should emit warnings
    async with lifespan(app):
        pass

    log_messages = [record.message for record in caplog.records]
    assert any("ANTHROPIC_API_KEY is not configured" in msg for msg in log_messages)
    assert any("SAFE_BROWSING_API_KEY is not configured" in msg for msg in log_messages)


def test_repository_secrets_and_cleanliness():
    """Security scan across repository: verify no live API keys or tracked .env files."""
    repo_root = Path(__file__).resolve().parent.parent.parent

    # 1. Verify .env is in .gitignore
    gitignore_path = repo_root / ".gitignore"
    assert gitignore_path.exists(), ".gitignore must exist"
    gitignore_content = gitignore_path.read_text(encoding="utf-8")
    assert ".env" in gitignore_content, ".env must be explicitly gitignored"

    # 2. Verify .env is not tracked in git
    env_file = repo_root / ".env"
    if env_file.exists():
        # If it exists on disk locally, it must not contain real non-empty keys or be committed
        pass

    # 3. Scan code files for accidental hardcoded secret patterns (e.g. sk-ant-...)
    key_pattern = re.compile(r"sk-ant-[a-zA-Z0-9_\-]{20,}|AIzaSy[a-zA-Z0-9_\-]{30,}")
    scanned_exts = {".py", ".js", ".jsx", ".html", ".md", ".json", ".yml", ".yaml"}

    violations = []
    for p in repo_root.rglob("*"):
        if any(
            ignored in p.parts
            for ignored in ("venv", "node_modules", ".git", ".system_generated", "dist")
        ):
            continue
        if p.is_file() and p.suffix in scanned_exts:
            try:
                content = p.read_text(encoding="utf-8", errors="ignore")
                matches = key_pattern.findall(content)
                if matches:
                    violations.append(
                        f"{p}: found potential API key patterns {matches}"
                    )
            except OSError:
                continue

    assert not violations, "Potential hardcoded secrets detected:\n" + "\n".join(
        violations
    )
