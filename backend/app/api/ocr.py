"""FastAPI route for screenshot OCR text extraction."""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.core.constants import (
    MAX_IMAGE_BYTES,
    OCR_RATE_LIMIT_REQUESTS,
    OCR_RATE_LIMIT_WINDOW_SECONDS,
)
from app.ocr.engine import (
    OCRBinaryNotFoundError,
    OCRError,
    OCRTimeoutError,
    get_ocr_engine,
)
from app.ocr.preprocess import (
    ImageCorruptError,
    ImageFormatError,
    ImageSizeError,
    validate_and_sanitize_image,
)
from app.schemas.ocr import OCRResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ocr"])

# Simple in-memory sliding-window rate limiter per client IP: ip -> list[timestamp]
_rate_limit_history: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_ip: str) -> None:
    """Enforce maximum OCR requests per minute per client IP."""
    now = time.monotonic()
    window_start = now - OCR_RATE_LIMIT_WINDOW_SECONDS

    # Clean old timestamps
    history = [ts for ts in _rate_limit_history[client_ip] if ts > window_start]
    if len(history) >= OCR_RATE_LIMIT_REQUESTS:
        _rate_limit_history[client_ip] = history
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {OCR_RATE_LIMIT_REQUESTS} OCR requests per minute allowed.",
        )

    history.append(now)
    _rate_limit_history[client_ip] = history


def reset_rate_limits() -> None:
    """Reset rate limiter state (used in tests)."""
    _rate_limit_history.clear()


@router.post("/ocr", response_model=OCRResult)
async def extract_text_from_screenshot(
    request: Request,
    file: Annotated[UploadFile, File(...)],
) -> OCRResult:
    """Extract text from an uploaded screenshot using OCR with Hindi + English support.

    The extracted text is returned for client-side review and editing before analysis.
    Processed entirely in memory: neither the image nor extracted text is stored on disk.
    """
    start_time = time.monotonic()
    client_ip = request.client.host if request.client else "unknown"

    # 1. Rate limiting
    _check_rate_limit(client_ip)

    # 2. Read file bytes with safety size limit
    try:
        # Read file in chunks to enforce size limit before buffering excessive memory
        content = await file.read(MAX_IMAGE_BYTES + 1024)
    except Exception as e:
        logger.warning(
            "OCR upload read error: status=400 error_type=%s",
            type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file.",
        ) from e

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_IMAGE_BYTES:
        max_mb = MAX_IMAGE_BYTES // (1024 * 1024)
        logger.warning(
            "OCR file oversize: size=%d max_bytes=%d",
            len(content),
            MAX_IMAGE_BYTES,
        )
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_mb} MB.",
        )

    # 3. Validate image magic bytes, decompression bombs, and strip EXIF
    try:
        clean_img = validate_and_sanitize_image(content)
    except ImageSizeError as e:
        logger.warning("OCR image size validation failed: error=%s", str(e))
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(e),
        ) from e
    except ImageFormatError as e:
        logger.warning("OCR unsupported format: error=%s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except ImageCorruptError as e:
        logger.warning("OCR corrupt image: error=%s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    # 4. Perform OCR extraction
    engine = get_ocr_engine()
    try:
        result = engine.extract(clean_img)
    except OCRBinaryNotFoundError as e:
        logger.error("OCR binary not found: error=%s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tesseract OCR engine is not installed or available on the server.",
        ) from e
    except OCRTimeoutError as e:
        logger.warning("OCR timeout: error=%s", str(e))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="OCR processing timed out. Please try a smaller or higher-contrast image.",
        ) from e
    except OCRError as e:
        logger.error("OCR engine failure: error=%s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {e}",
        ) from e
    finally:
        clean_img.close()

    duration = time.monotonic() - start_time
    logger.info(
        "OCR processed: size_bytes=%d duration_sec=%.3f confidence=%.2f lang=%s",
        len(content),
        duration,
        result.confidence,
        result.language_guess,
    )

    # 5. Handle empty extraction
    if not result.text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text could be recognized in the uploaded screenshot. Please check the image and try again.",
        )

    return result
