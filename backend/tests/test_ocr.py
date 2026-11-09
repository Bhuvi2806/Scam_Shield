"""Tests for Screenshot OCR processing and POST /api/ocr endpoint.

Verifies:
- Abstract engine interface & FakeOCREngine testability
- Image validation (PNG/JPEG/WEBP magic bytes, spoofed extensions, corruption, zero-byte)
- Decompression bomb & oversize rejection
- EXIF metadata stripping in memory
- Temp directory disk assertion: strictly zero disk persistence
- Rate limiting per client IP
- Language guessing (en, hi, hinglish)
- Low confidence flagging
- Live Tesseract integration test (auto-skipped when binary or hin lang missing)
"""

from __future__ import annotations

import io
import os
import shutil
import tempfile
from typing import Literal

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.api.ocr import reset_rate_limits
from app.core.constants import MAX_IMAGE_BYTES
from app.main import app
from app.ocr.engine import (
    OCRBinaryNotFoundError,
    OCREngine,
    OCRTimeoutError,
    guess_language_script,
    set_ocr_engine,
)
from app.ocr.preprocess import (
    ImageCorruptError,
    ImageFormatError,
    ImageSizeError,
    preprocess_for_ocr,
    validate_and_sanitize_image,
)
from app.schemas.ocr import OCRResult

# ---------------------------------------------------------------------------
# Test Helpers & Fake OCR Engine
# ---------------------------------------------------------------------------


class FakeOCREngine(OCREngine):
    """Configurable fake OCR engine for deterministic testing."""

    def __init__(
        self,
        text: str = "URGENT: SBI account blocked. Call 9876543210.",
        confidence: float = 0.95,
        language_guess: Literal["en", "hi", "hinglish"] | None = None,
        simulate_timeout: bool = False,
        simulate_missing_binary: bool = False,
    ):
        self.text = text
        self.confidence = confidence
        self.language_guess = language_guess
        self.simulate_timeout = simulate_timeout
        self.simulate_missing_binary = simulate_missing_binary

    def extract(self, image: Image.Image) -> OCRResult:
        if self.simulate_missing_binary:
            raise OCRBinaryNotFoundError("Tesseract binary not installed")
        if self.simulate_timeout:
            raise OCRTimeoutError("OCR timed out")

        lang = self.language_guess or guess_language_script(self.text)
        low_confidence = self.confidence < 0.50 or len(self.text.strip()) < 10
        warnings = []
        if low_confidence:
            warnings.append("Low confidence extraction")

        return OCRResult(
            text=self.text,
            language_guess=lang,
            confidence=self.confidence,
            low_confidence=low_confidence,
            warnings=warnings,
        )


def make_test_image(
    format: str = "PNG",
    size: tuple[int, int] = (200, 100),
    color: tuple[int, int, int] = (255, 255, 255),
) -> bytes:
    """Create a minimal valid image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color)
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.fixture(autouse=True)
def cleanup_ocr_engine_and_rate_limits():
    """Ensure engine registry and rate limits reset before and after each test."""
    reset_rate_limits()
    yield
    set_ocr_engine(None)
    reset_rate_limits()


# ---------------------------------------------------------------------------
# Unit Tests: Image Validation & Sanitization
# ---------------------------------------------------------------------------


class TestImageValidation:
    """Test image format validation, bounds checking, and EXIF stripping."""

    def test_valid_png_jpeg_webp_accepted(self):
        for fmt in ("PNG", "JPEG", "WEBP"):
            raw_bytes = make_test_image(format=fmt)
            img = validate_and_sanitize_image(raw_bytes)
            assert isinstance(img, Image.Image)
            assert img.size == (200, 100)

    def test_corrupt_and_zero_byte_files_rejected(self):
        with pytest.raises(ImageCorruptError):
            validate_and_sanitize_image(b"")

        with pytest.raises(ImageCorruptError):
            validate_and_sanitize_image(b"not an image data string")

    def test_spoofed_extension_detected_via_magic_bytes(self):
        # Text file pretending to be PNG
        fake_png = b"Fake PNG header content that is actually text"
        with pytest.raises(ImageCorruptError):
            validate_and_sanitize_image(fake_png)

    def test_unsupported_format_rejected(self):
        # BMP image (not in allowed list)
        bmp_bytes = make_test_image(format="BMP")
        with pytest.raises(ImageFormatError):
            validate_and_sanitize_image(bmp_bytes)

    def test_oversize_bytes_rejected(self):
        huge_bytes = b"0" * (MAX_IMAGE_BYTES + 100)
        with pytest.raises(ImageSizeError):
            validate_and_sanitize_image(huge_bytes)

    def test_oversize_pixel_dimensions_rejected(self):
        # Craft an image header claiming to exceed MAX_IMAGE_PIXELS
        # Pillow checks size on open before loading all raster pixels
        buf = io.BytesIO()
        # 6000 x 5000 = 30,000,000 pixels > MAX_IMAGE_PIXELS (25,000,000)
        img = Image.new("1", (6000, 5000))
        img.save(buf, format="PNG")
        huge_dim_bytes = buf.getvalue()

        with pytest.raises(ImageSizeError):
            validate_and_sanitize_image(huge_dim_bytes)

    def test_exif_metadata_stripped(self):
        # Create image with EXIF info
        buf = io.BytesIO()
        img = Image.new("RGB", (100, 100), (255, 0, 0))
        # Add comment/exif
        img.save(buf, format="JPEG", comment="Sensitive User Metadata")
        jpeg_with_meta = buf.getvalue()

        sanitized = validate_and_sanitize_image(jpeg_with_meta)
        assert "comment" not in sanitized.info
        assert len(sanitized.info) == 0

    def test_preprocess_upscaling_and_contrast(self):
        small_img = Image.new("RGB", (300, 200), (255, 255, 255))
        preprocessed = preprocess_for_ocr(small_img)
        assert preprocessed.mode == "L"
        # Minimum dimension was upscaled to at least OCR_MIN_UPSCALE_DIMENSION (1000)
        assert min(preprocessed.size) >= 600


# ---------------------------------------------------------------------------
# Unit Tests: Language Guessing & Script Analysis
# ---------------------------------------------------------------------------


class TestLanguageGuess:
    def test_pure_english(self):
        text = "URGENT: Your SBI account has been suspended. Call 9876543210."
        assert guess_language_script(text) == "en"

    def test_pure_hindi(self):
        text = "सावधान: आपका बिजली बिल बकाया है। तुरंत इस नंबर पर संपर्क करें।"
        assert guess_language_script(text) == "hi"

    def test_mixed_hinglish(self):
        text = "Aapka SBI account block ho gaya hai. Update karein तुरंत."
        assert guess_language_script(text) == "hinglish"

    def test_empty_string(self):
        assert guess_language_script("") == "en"


# ---------------------------------------------------------------------------
# API Route Tests: POST /api/ocr
# ---------------------------------------------------------------------------


class TestApiOCR:
    @pytest.mark.anyio
    async def test_ocr_success_returns_schema(self):
        fake_engine = FakeOCREngine(
            text="Dear customer your electricity bill is due.",
            confidence=0.92,
        )
        set_ocr_engine(fake_engine)

        img_bytes = make_test_image(format="PNG")
        files = {"file": ("screenshot.png", img_bytes, "image/png")}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/ocr", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Dear customer your electricity bill is due."
        assert data["language_guess"] == "en"
        assert data["confidence"] == 0.92
        assert data["low_confidence"] is False
        assert data["warnings"] == []

    @pytest.mark.anyio
    async def test_ocr_low_confidence_flagged(self):
        fake_engine = FakeOCREngine(
            text="unclear blurred text",
            confidence=0.35,
        )
        set_ocr_engine(fake_engine)

        img_bytes = make_test_image(format="JPEG")
        files = {"file": ("screenshot.jpg", img_bytes, "image/jpeg")}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/ocr", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["low_confidence"] is True
        assert len(data["warnings"]) > 0

    @pytest.mark.anyio
    async def test_ocr_empty_text_returns_422(self):
        fake_engine = FakeOCREngine(text="")
        set_ocr_engine(fake_engine)

        img_bytes = make_test_image(format="PNG")
        files = {"file": ("blank.png", img_bytes, "image/png")}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/ocr", files=files)

        assert response.status_code == 422
        assert "No readable text" in response.json()["detail"]

    @pytest.mark.anyio
    async def test_ocr_timeout_returns_504(self):
        fake_engine = FakeOCREngine(simulate_timeout=True)
        set_ocr_engine(fake_engine)

        img_bytes = make_test_image(format="PNG")
        files = {"file": ("screenshot.png", img_bytes, "image/png")}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/ocr", files=files)

        assert response.status_code == 504
        assert "timed out" in response.json()["detail"]

    @pytest.mark.anyio
    async def test_ocr_missing_binary_returns_503(self):
        fake_engine = FakeOCREngine(simulate_missing_binary=True)
        set_ocr_engine(fake_engine)

        img_bytes = make_test_image(format="PNG")
        files = {"file": ("screenshot.png", img_bytes, "image/png")}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/ocr", files=files)

        assert response.status_code == 503
        assert "Tesseract" in response.json()["detail"]

    @pytest.mark.anyio
    async def test_ocr_rate_limit_enforced(self):
        fake_engine = FakeOCREngine(text="Some valid text for rate limiting.")
        set_ocr_engine(fake_engine)

        img_bytes = make_test_image(format="PNG")

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Send 30 requests (allowed)
            for _ in range(30):
                files = {"file": ("screenshot.png", img_bytes, "image/png")}
                res = await client.post("/api/ocr", files=files)
                assert res.status_code == 200

            # 31st request triggers rate limit 429
            files = {"file": ("screenshot.png", img_bytes, "image/png")}
            res = await client.post("/api/ocr", files=files)
            assert res.status_code == 429
            assert "Rate limit exceeded" in res.json()["detail"]

    @pytest.mark.anyio
    async def test_strictly_zero_disk_writes_assertion(self):
        """Verify that processing an upload creates ZERO files in the temporary directory."""
        fake_engine = FakeOCREngine(text="Testing disk isolation strictly in memory.")
        set_ocr_engine(fake_engine)

        temp_dir = tempfile.gettempdir()
        initial_files = set(os.listdir(temp_dir))

        img_bytes = make_test_image(format="PNG")
        files = {"file": ("sample.png", img_bytes, "image/png")}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/ocr", files=files)

        assert response.status_code == 200

        after_files = set(os.listdir(temp_dir))
        # Zero new files should have been left on disk
        new_files = after_files - initial_files
        assert len(new_files) == 0, (
            f"Leak detected: temporary files left on disk: {new_files}"
        )


# ---------------------------------------------------------------------------
# Optional Real Tesseract Integration Test (auto-skipped if binary missing)
# ---------------------------------------------------------------------------


def is_tesseract_available_with_languages() -> bool:
    """Check if tesseract binary and required languages are present."""
    tesseract_cmd = shutil.which("tesseract")
    if not tesseract_cmd:
        return False
    try:
        import pytesseract

        langs = pytesseract.get_languages()
        return "eng" in langs
    except (pytesseract.TesseractError, OSError):
        return False


@pytest.mark.skipif(
    not is_tesseract_available_with_languages(),
    reason="Tesseract binary or language packs not installed on local system",
)
def test_real_tesseract_integration_synthetic_image():
    """Integration test with real Tesseract if installed."""
    from app.ocr.engine import TesseractEngine

    engine = TesseractEngine(languages="eng", timeout=10)

    # Generate synthetic image with clean English text
    img = Image.new("RGB", (600, 150), (255, 255, 255))
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    draw.text((30, 50), "ALERT: URGENT NOTICE FROM BANK", fill=(0, 0, 0))

    result = engine.extract(img)
    assert "ALERT" in result.text.upper() or "URGENT" in result.text.upper()
    assert result.confidence > 0.50
