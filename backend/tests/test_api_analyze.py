"""Tests for POST /api/analyze endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.constants import LOWEST_RISK_DISCLAIMER, MAX_TEXT_LENGTH
from app.main import app


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
    assert "rule" in data
    assert data["rule"]["verdict"] == "likely_scam"
    assert data["rule"]["score"] >= 60
    assert data["rule"]["scam_type_guess"] == "digital arrest"
    assert len(data["rule"]["red_flags"]) > 0
    assert "disclaimer" in data["rule"]


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
    assert "rule" in data
    assert data["rule"]["verdict"] == "safe"
    assert data["rule"]["score"] < 30
    assert data["rule"]["scam_type_guess"] is None
    assert data["rule"]["red_flags"] == []
    assert data["rule"]["disclaimer"] == LOWEST_RISK_DISCLAIMER


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
