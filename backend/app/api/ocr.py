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
from app.ocr.qr_engine import QREngine
from app.schemas.ocr import OCRResult
from app.schemas.qr import QRResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ocr"])

# Simple in-memory sliding-window rate limiter per client IP: ip -> list[timestamp]
_rate_limit_history: dict[str, list[float]] = defaultdict(list)
_qr_engine = QREngine()


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

    # 4. Perform QR detection and OCR extraction
    qr_result = _qr_engine.scan_image(clean_img)

    engine = get_ocr_engine()
    try:
        result = engine.extract(clean_img)
    except OCRBinaryNotFoundError as e:
        # If Tesseract binary is not installed, but a QR code was decoded, return the QR result cleanly!
        if qr_result and qr_result.found and qr_result.raw_text:
            clean_img.close()
            return OCRResult(
                text=f"[QR Code: {qr_result.qr_type.upper()}] {qr_result.raw_text}",
                language_guess="en",
                confidence=1.0,
                low_confidence=False,
                warnings=["Text decoded directly from QR code payload."],
                qr_result=qr_result,
            )
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

    if qr_result and qr_result.found:
        result.qr_result = qr_result
        if not result.text:
            result.text = f"[QR Code: {qr_result.qr_type.upper()}] {qr_result.raw_text}"
            result.confidence = 1.0
            result.low_confidence = False

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


@router.post("/analyze-qr", response_model=QRResult)
async def analyze_qr_code(
    request: Request,
    file: Annotated[UploadFile, File(...)],
) -> QRResult:
    """Analyze a QR code directly from an uploaded image in memory."""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    try:
        content = await file.read(MAX_IMAGE_BYTES + 1024)
    except Exception as e:
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
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_mb} MB.",
        )

    try:
        clean_img = validate_and_sanitize_image(content)
    except (ImageSizeError, ImageFormatError, ImageCorruptError) as e:
        status_code = (
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            if isinstance(e, ImageSizeError)
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=str(e)) from e

    try:
        qr_result = _qr_engine.scan_image(clean_img)
    finally:
        clean_img.close()

    return qr_result
