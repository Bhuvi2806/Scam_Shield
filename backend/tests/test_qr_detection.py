"""Tests for QR Code detection, UPI payment link parsing, and scam traps."""

from __future__ import annotations

import io

import pytest
import zxingcpp
from httpx import ASGITransport, AsyncClient

from app.detectors.upi_parser import parse_upi_uri
from app.main import app
from app.ocr.qr_engine import QREngine


def _create_qr_image_bytes(content: str) -> bytes:
    """Helper to generate an in-memory PNG QR code using zxing-cpp and Pillow."""
    from PIL import Image

    barcode = zxingcpp.create_barcode(content, zxingcpp.BarcodeFormat.QRCode)
    zx_img = zxingcpp.write_barcode_to_image(barcode)
    pil_img = Image.fromarray(zx_img).resize((300, 300), Image.Resampling.NEAREST)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()


def test_parse_genuine_merchant_upi():
    """Verify standard legitimate merchant UPI QR code without deceptive notes is classified as safe."""
    uri = "upi://pay?pa=ramesh.grocery@icici&pn=Ramesh%20Kirana%20Store&am=250.00&cu=INR&tn=Groceries"
    payload, red_flags, score = parse_upi_uri(uri)

    assert payload is not None
    assert payload.payee_vpa == "ramesh.grocery@icici"
    assert payload.payee_name == "Ramesh Kirana Store"
    assert payload.amount == 250.00
    assert payload.is_valid_vpa is True
    assert score == 0
    assert len(red_flags) == 0


def test_parse_refund_cashback_trap_upi():
    """Verify classic 'scan to receive refund' fraud QR code is flagged as high-risk scam."""
    uri = "upi://pay?pa=refunddesk92@ybl&pn=Paytm%20Customer%20Care&am=4999.00&cu=INR&tn=Instant%20Refund%20Cashback%20Approval"
    payload, red_flags, score = parse_upi_uri(uri)

    assert payload is not None
    assert payload.payee_vpa == "refunddesk92@ybl"
    assert score >= 85
    categories = [rf.category for rf in red_flags]
    assert "UPI Scan-to-Receive Trap" in categories
    assert "Payee Authority Impersonation" in categories
    assert "Preset Debit Amount" in categories


def test_parse_army_canteen_impersonation_upi():
    """Verify military/defense canteen impersonation scam in transaction note is flagged."""
    uri = "upi://pay?pa=singh882@okhdfcbank&pn=Subedar%20Singh&am=15000.00&cu=INR&tn=Army%20Canteen%20Furniture%20Advance"
    payload, red_flags, score = parse_upi_uri(uri)

    assert payload is not None
    assert score >= 75
    assert any("Army/Defense" in rf.reason for rf in red_flags)


def test_parse_invalid_vpa():
    """Verify malformed VPA format is flagged."""
    uri = "upi://pay?pa=not-a-valid-vpa&pn=Unknown&cu=INR"
    payload, red_flags, score = parse_upi_uri(uri)

    assert payload is not None
    assert payload.is_valid_vpa is False
    assert score > 0
    assert any(rf.category == "Suspicious VPA Format" for rf in red_flags)


def test_qr_engine_upi_image_scan():
    """Verify QREngine correctly decodes an in-memory QR image and extracts UPI fraud findings."""
    qr_uri = "upi://pay?pa=fraud99@axl&pn=Google%20Pay%20Support&am=2500.00&tn=Reward%20Claim%20Receive%20Money"
    img_bytes = _create_qr_image_bytes(qr_uri)

    from PIL import Image

    with Image.open(io.BytesIO(img_bytes)) as pil_img:
        engine = QREngine()
        result = engine.scan_image(pil_img)

    assert result.found is True
    assert result.qr_type == "upi"
    assert result.verdict == "likely_scam"
    assert result.score >= 85
    assert result.upi_payload is not None
    assert result.upi_payload.payee_vpa == "fraud99@axl"
    assert len(result.red_flags) > 0


def test_qr_engine_phishing_url_scan():
    """Verify QREngine flags a QR code pointing to a suspicious phishing URL."""
    phishing_url = "http://192.168.1.1/update-kyc.apk"
    img_bytes = _create_qr_image_bytes(phishing_url)

    from PIL import Image

    with Image.open(io.BytesIO(img_bytes)) as pil_img:
        engine = QREngine()
        result = engine.scan_image(pil_img)

    assert result.found is True
    assert result.qr_type == "url"
    assert result.verdict in {"suspicious", "likely_scam"}
    assert result.score >= 60
    assert any("Suspicious URL" in rf.category for rf in result.red_flags)


def test_qr_engine_no_qr_image():
    """Verify QREngine gracefully handles an image without a QR code."""
    from PIL import Image

    blank_img = Image.new("RGB", (200, 200), color="white")
    engine = QREngine()
    result = engine.scan_image(blank_img)

    assert result.found is False
    assert result.qr_type == "none"
    assert result.verdict == "safe"
    assert result.score == 0


@pytest.mark.anyio
async def test_api_analyze_qr_endpoint():
    """POST /api/analyze-qr with a scam QR image returns 200 with structured QRResult."""
    qr_uri = "upi://pay?pa=trap101@ybl&pn=SBI%20Verification&am=1000.00&tn=KYC%20Verification%20Fee"
    img_bytes = _create_qr_image_bytes(qr_uri)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test_qr.png", img_bytes, "image/png")}
        response = await client.post("/api/analyze-qr", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["qr_type"] == "upi"
    assert data["verdict"] == "likely_scam"
    assert data["upi_payload"]["payee_vpa"] == "trap101@ybl"
    assert "In India's UPI system" in data["safety_rule_en"]
