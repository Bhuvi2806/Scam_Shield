"""OCR engine interface and Tesseract implementation with Hindi + English support."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import Literal

import pytesseract
from PIL import Image

from app.core.constants import (
    OCR_LANGUAGES,
    OCR_LOW_CONFIDENCE_THRESHOLD,
    OCR_TIMEOUT_SECONDS,
)
from app.ocr.preprocess import preprocess_for_ocr
from app.schemas.ocr import OCRResult


class OCRError(Exception):
    """Base exception for OCR processing failures."""


class OCRTimeoutError(OCRError):
    """Raised when OCR extraction exceeds the configured timeout."""


class OCRBinaryNotFoundError(OCRError):
    """Raised when tesseract binary is not installed or not in system PATH."""


def guess_language_script(text: str) -> Literal["en", "hi", "hinglish"]:
    """Classify text into 'en', 'hi', or 'hinglish' based on script and vocabulary.

    Analyzes Devanagari Unicode characters (U+0900 to U+097F) vs Latin letters (A-Z, a-z)
    and recognizes common Romanized Hindi (Hinglish) grammatical keywords.
    """
    if not text:
        return "en"

    devanagari_count = len(re.findall(r"[\u0900-\u097F]", text))
    latin_count = len(re.findall(r"[a-zA-Z]", text))
    total_alpha = devanagari_count + latin_count

    if total_alpha == 0:
        return "en"

    dev_ratio = devanagari_count / total_alpha
    latin_ratio = latin_count / total_alpha

    # 1. Dual-script presence (both Devanagari and Latin present in notable amounts)
    if devanagari_count >= 2 and latin_count >= 5:
        if dev_ratio > 0.85:
            return "hi"
        if latin_ratio > 0.95:
            # Check for Romanized Hindi keywords before defaulting to English
            hinglish_keywords = {
                "karein",
                "kare",
                "karo",
                "aapka",
                "aapke",
                "khata",
                "bheje",
                "rupaye",
                "paisa",
                "aayega",
                "hoga",
                "hai",
                "nahi",
                "turant",
            }
            words = set(re.findall(r"[a-zA-Z]+", text.lower()))
            if words & hinglish_keywords:
                return "hinglish"
            return "en"
        return "hinglish"

    # 2. Pure or predominant Devanagari script
    if dev_ratio > 0.50:
        return "hi"

    # 3. Latin-script only or predominant: check for Romanized Hindi (Hinglish)
    hinglish_markers = {
        "karein",
        "kare",
        "karo",
        "aapka",
        "aapke",
        "khata",
        "bheje",
        "rupaye",
        "paisa",
        "aayega",
        "hoga",
        "hai",
        "nahi",
        "turant",
        "yojana",
    }
    words = set(re.findall(r"[a-zA-Z]+", text.lower()))
    if len(words & hinglish_markers) >= 2:
        return "hinglish"

    return "en"


class OCREngine(ABC):
    """Abstract interface for screenshot OCR extraction."""

    @abstractmethod
    def extract(self, image: Image.Image) -> OCRResult:
        """Extract plain text, language guess, and confidence from PIL Image."""


class TesseractEngine(OCREngine):
    """Production OCR engine wrapping pytesseract with hin+eng multi-language support."""

    def __init__(
        self, languages: str = OCR_LANGUAGES, timeout: int = OCR_TIMEOUT_SECONDS
    ):
        self.languages = languages
        self.timeout = timeout

    def extract(self, image: Image.Image) -> OCRResult:
        """Extract text and confidence metrics using Tesseract."""
        # 1. Preprocess image in-memory
        enhanced_img = preprocess_for_ocr(image)

        try:
            # 2. Extract detailed word data including bounding box & word confidences
            data = pytesseract.image_to_data(
                enhanced_img,
                lang=self.languages,
                timeout=self.timeout,
                output_type=pytesseract.Output.DICT,
            )

            # 3. Extract full text preserving layout & linebreaks
            raw_text = pytesseract.image_to_string(
                enhanced_img,
                lang=self.languages,
                timeout=self.timeout,
            )
        except pytesseract.TesseractNotFoundError as e:
            raise OCRBinaryNotFoundError(
                "Tesseract OCR binary is not installed or not configured in system PATH."
            ) from e
        except RuntimeError as e:
            msg = str(e).lower()
            if "timeout" in msg:
                raise OCRTimeoutError(
                    f"OCR processing timed out after {self.timeout}s."
                ) from e
            raise OCRError(f"Tesseract OCR engine error: {e}") from e
        except Exception as e:
            msg = str(e).lower()
            if "timeout" in msg:
                raise OCRTimeoutError(
                    f"OCR processing timed out after {self.timeout}s."
                ) from e
            raise OCRError(f"Unexpected OCR failure: {e}") from e

        # 4. Clean extracted text
        cleaned_text = raw_text.strip()

        # 5. Calculate average word confidence
        confidences: list[float] = []
        words = data.get("text", [])
        confs = data.get("conf", [])

        for w, c in zip(words, confs):
            if w and w.strip():
                try:
                    conf_val = float(c)
                    if conf_val >= 0:
                        confidences.append(conf_val)
                except (ValueError, TypeError):
                    continue

        if confidences:
            # Tesseract returns 0-100; normalize to 0.0-1.0
            avg_confidence = round(sum(confidences) / (len(confidences) * 100.0), 2)
        else:
            avg_confidence = 0.0

        low_confidence = (
            avg_confidence < OCR_LOW_CONFIDENCE_THRESHOLD or len(cleaned_text) < 10
        )
        warnings: list[str] = []

        if not cleaned_text:
            warnings.append("No readable text could be recognized in this image.")
        elif low_confidence:
            warnings.append(
                "Extracted text confidence is low. Please review and correct the text before analysis."
            )

        lang_guess = guess_language_script(cleaned_text)

        return OCRResult(
            text=cleaned_text,
            language_guess=lang_guess,
            confidence=avg_confidence,
            low_confidence=low_confidence,
            warnings=warnings,
        )


# Global engine registry for dependency injection in tests
_engine_instance: OCREngine | None = None


def get_ocr_engine() -> OCREngine:
    """Retrieve active OCR engine singleton or default to TesseractEngine."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = TesseractEngine()
    return _engine_instance


def set_ocr_engine(engine: OCREngine | None) -> None:
    """Override active OCR engine (used in tests with FakeOCREngine)."""
    global _engine_instance
    _engine_instance = engine
