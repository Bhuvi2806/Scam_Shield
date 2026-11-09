"""Scam Shield — FastAPI application entry point with security hardening."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.analyze import router as analyze_router
from app.api.ocr import router as ocr_router
from app.core.config import settings
from app.core.constants import (
    MAX_ANALYZE_PAYLOAD_BYTES,
    MAX_GENERAL_PAYLOAD_BYTES,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager with startup diagnostics."""
    if not settings.ANTHROPIC_API_KEY:
        logger.warning(
            "Scam Shield starting in degraded mode: ANTHROPIC_API_KEY is not configured. "
            "LLM layer will be skipped; rule-based detection and heuristics remain active."
        )
    if not settings.SAFE_BROWSING_API_KEY:
        logger.warning(
            "Scam Shield starting in degraded mode: SAFE_BROWSING_API_KEY is not configured. "
            "Safe Browsing API lookups will be skipped; local heuristic URL checks remain active."
        )
    yield


app = FastAPI(
    title="Scam Shield API",
    description="Detect scam messages and provide safety guidance.",
    version="0.1.0",
    lifespan=lifespan,
)

# 1. CORS lockdown to configured frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# 2. Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add defensive security headers to all HTTP responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none';"
    )
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "0"
    return response


# 3. Payload size enforcement middleware
@app.middleware("http")
async def limit_payload_size(request: Request, call_next):
    """Reject requests with Content-Length exceeding endpoint ceilings."""
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            length = int(content_length)
            if (
                request.url.path == "/api/analyze"
                and length > MAX_ANALYZE_PAYLOAD_BYTES
            ):
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": f"Payload too large. Maximum allowed size is {MAX_ANALYZE_PAYLOAD_BYTES} bytes."
                    },
                )
            if length > MAX_GENERAL_PAYLOAD_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": f"Payload too large. Maximum allowed size is {MAX_GENERAL_PAYLOAD_BYTES} bytes."
                    },
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid Content-Length header."},
            )
    return await call_next(request)


# 4. Sanitized unhandled exception handler
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return sanitized 500 error without leaking stack traces."""
    logger.error(
        "Unhandled server error processing %s %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again later."
        },
    )


app.include_router(analyze_router)
app.include_router(ocr_router)


@app.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}
