"""Tests for POST /api/analyze endpoint."""

import pytest
from app.core.constants import LOWEST_RISK_DISCLAIMER, MAX_TEXT_LENGTH
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.anyio
async def test_analyze_scam_message_success():
    """POST /api/analyze with scam message returns 200 OK and likely_scam verdict."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "URGENT: Non-bailable arrest warrant has been issued against you by CBI. You are under digital arrest. Connect on Skype video call."
        }
        response = await client.post("/api/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "verdict" in data
    assert "layers" in data
    assert "rule" in data["layers"]
    assert data["layers"]["rule"]["verdict"] == "likely_scam"
    assert data["layers"]["rule"]["score"] >= 60
    assert data["layers"]["rule"]["scam_type_guess"] == "digital arrest"
    assert len(data["layers"]["rule"]["red_flags"]) > 0
    assert "disclaimer" in data["layers"]["rule"]

    # Final verdict
    assert data["verdict"]["verdict"] in {"suspicious", "likely_scam"}
    assert data["verdict"]["scam_type"] == "digital_arrest"
    assert len(data["verdict"]["actions"]) > 0
    assert any(a["id"] == "ACT-1930" for a in data["verdict"]["actions"])


@pytest.mark.anyio
async def test_analyze_genuine_message_success():
    """POST /api/analyze with authentic OTP alert returns 200 OK and safe verdict with exact disclaimer."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "Your SBI OTP for transaction is 839201. Do not share this OTP with anyone, including bank staff."
        }
        response = await client.post("/api/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "verdict" in data
    assert "layers" in data
    assert "rule" in data["layers"]
    assert data["layers"]["rule"]["verdict"] == "safe"
    assert data["layers"]["rule"]["score"] < 30
    assert data["layers"]["rule"]["scam_type_guess"] is None
    assert data["layers"]["rule"]["red_flags"] == []
    assert data["layers"]["rule"]["disclaimer"] == LOWEST_RISK_DISCLAIMER

    # Final verdict
    assert data["verdict"]["verdict"] == "safe"
    assert data["verdict"]["scam_type"] == "none"
    assert data["verdict"]["disclaimer"] == LOWEST_RISK_DISCLAIMER
    assert "100% safe" not in data["verdict"]["explanation_en"]
    assert any(a["id"] == "ACT-1930" for a in data["verdict"]["actions"])


@pytest.mark.anyio
async def test_analyze_empty_input_rejected():
    """POST /api/analyze with empty string returns 422 Unprocessable Entity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/analyze", json={"text": ""})

    assert response.status_code == 422


@pytest.mark.anyio
async def test_analyze_whitespace_input_rejected():
    """POST /api/analyze with only whitespace returns 422 Unprocessable Entity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/analyze", json={"text": "     \n\t  "})

    assert response.status_code == 422


@pytest.mark.anyio
async def test_analyze_too_long_input_rejected():
    """POST /api/analyze with text exceeding MAX_TEXT_LENGTH returns 422 Unprocessable Entity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        too_long_text = "A" * (MAX_TEXT_LENGTH + 10)
        response = await client.post("/api/analyze", json={"text": too_long_text})

    assert response.status_code == 422
