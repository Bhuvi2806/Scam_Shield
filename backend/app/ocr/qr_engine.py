"""In-memory QR code detection and scam analysis engine."""

from __future__ import annotations

import logging

import zxingcpp
from PIL import Image

from app.core.url_utils import check_local_url_heuristics, defang_url
from app.detectors.upi_parser import parse_upi_uri
from app.schemas.qr import QRRedFlag, QRResult

logger = logging.getLogger(__name__)


class QREngine:
    """Detects and analyzes QR codes within images."""

    def scan_image(self, image: Image.Image) -> QRResult:
        """Scan a PIL Image for QR codes and evaluate potential fraud indicators."""
        raw_result = self._detect_barcode(image)
        if not raw_result or not raw_result.text:
            return QRResult(found=False, qr_type="none", verdict="safe", score=0)

        raw_text = raw_result.text.strip()
        lower_text = raw_text.lower()

        # 1. UPI Payment Link (upi://pay?...)
        if lower_text.startswith("upi://pay"):
            payload, red_flags, score = parse_upi_uri(raw_text)
            verdict = (
                "likely_scam"
                if score >= 60
                else "suspicious"
                if score >= 30
                else "safe"
            )
            return QRResult(
                found=True,
                raw_text=raw_text,
                qr_type="upi",
                upi_payload=payload,
                verdict=verdict,
                score=score,
                red_flags=red_flags,
            )

        # 2. Web URL
        if lower_text.startswith(("http://", "https://")):
            findings = check_local_url_heuristics(raw_text)
            red_flags: list[QRRedFlag] = []
            score = 0
            defanged = defang_url(raw_text)

            for finding_code in findings:
                is_critical = finding_code in {"apk_download", "ip_host"}
                rf = QRRedFlag(
                    category=f"Suspicious URL: {finding_code}",
                    reason=f"URL threat heuristic detected ({finding_code}). Target: {defanged}",
                    severity="critical" if is_critical else "high",
                )
                red_flags.append(rf)
                score = max(score, 80 if is_critical else 60)

            verdict = (
                "likely_scam"
                if score >= 60
                else "suspicious"
                if score >= 30
                else "safe"
            )
            return QRResult(
                found=True,
                raw_text=raw_text,
                qr_type="url",
                verdict=verdict,
                score=score,
                red_flags=red_flags,
            )

        # 3. Plain Text QR code
        return QRResult(
            found=True,
            raw_text=raw_text,
            qr_type="text",
            verdict="safe",
            score=0,
            red_flags=[],
        )

    def _detect_barcode(self, image: Image.Image) -> zxingcpp.Barcode | None:
        """Attempt QR code detection with multi-pass fallback (original, grayscale, rotated)."""
        # Pass 1: Direct read
        try:
            result = zxingcpp.read_barcode(image, zxingcpp.BarcodeFormat.QRCode)
            if result and result.text:
                return result
        except Exception as exc:  # noqa: BLE001
            logger.debug("QR pass 1 failed: %s", type(exc).__name__)

        # Pass 2: Grayscale conversion
        try:
            gray = image.convert("L")
            result = zxingcpp.read_barcode(gray, zxingcpp.BarcodeFormat.QRCode)
            if result and result.text:
                return result
        except Exception as exc:  # noqa: BLE001
            logger.debug("QR pass 2 failed: %s", type(exc).__name__)

        # Pass 3: Rotations (90, 180, 270)
        for angle in (90, 180, 270):
            try:
                rotated = image.rotate(angle, expand=True)
                result = zxingcpp.read_barcode(rotated, zxingcpp.BarcodeFormat.QRCode)
                if result and result.text:
                    return result
            except Exception as exc:  # noqa: BLE001
                logger.debug(
                    "QR pass rotation %d failed: %s", angle, type(exc).__name__
                )

        return None
