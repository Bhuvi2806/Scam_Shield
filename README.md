# Scam Shield 🛡️

**Detect scam messages. Protect your family.**

Scam Shield is a web app where you paste a suspicious SMS, WhatsApp message, or call transcript and get an instant verdict — *Safe*, *Suspicious*, or *Likely Scam* — along with highlighted red flags, a plain-language explanation (Hindi & English), and a clear "what to do now" checklist.

> **Status:** M1 Step 2 — Dataset complete (35 scam patterns + 70 labelled synthetic messages). Ready for rule-based detector (M1 Step 3).

---

## Dataset & Evaluation

Scam Shield uses data-driven rule patterns and a synthetic benchmark dataset:

- **`backend/data/patterns.json`**: 35 validated detection patterns covering all 7 target scam types (`digital arrest`, `fake KYC`, `UPI refund`, `job/task scam`, `lottery/prize`, `electricity-bill threat`, `other`). Each pattern includes dual-script Hindi (Devanagari + Hinglish) and English keywords, regexes, red-flag category, and weight (1-5).
- **`backend/data/test_set.json`**: 70 synthetic labelled messages (35 scam, 35 genuine) in English, Hindi, and Hinglish. Genuine samples include tricky edge cases: genuine bank OTPs with security disclaimers, debit/credit transaction alerts, delivery OTP updates, official electricity bill reminders, and RBI-mandated KYC notifications.
- **Privacy Guaranteed**: Strictly synthetic data with placeholders (`XXXXXXXX`, `example.com`). Zero personal or banking data.
- **Documentation**: See [backend/data/README.md](file:///d:/ScamShield/backend/data/README.md) for full schema definitions and contribution instructions.

---

## Folder Structure

```
scam-shield/
├── AGENT.md                  # AI agent rulebook
├── README.md                 # This file
├── .env.example              # Environment variable template
├── .gitignore
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI route modules
│   │   ├── core/             # Config, dataset loaders (load_patterns, load_test_set)
│   │   ├── detectors/        # Rule-based detection (future — M1 Step 3)
│   │   ├── llm/              # LLM integration (future — M2)
│   │   ├── ocr/              # OCR processing (future — M3)
│   │   ├── schemas/          # Pydantic models (dataset.py, etc.)
│   │   └── main.py           # App entry point
│   ├── data/
│   │   ├── patterns.json     # 35 scam patterns
│   │   ├── test_set.json     # 70 labelled test messages
│   │   └── README.md         # Dataset guide
│   ├── tests/
│   │   ├── test_health.py    # Health endpoint tests
│   │   └── test_dataset.py   # Dataset schema & integrity tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/api.js        # Backend API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── docs/
    ├── progress.md           # Phase-by-phase progress log
    └── decisions.md          # Architecture decision log
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp ../.env.example ../.env   # Fill in your API keys
uvicorn app.main:app --reload
```

The API starts at **http://localhost:8000**. Check health: `GET /health`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at **http://localhost:5173**.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API key (future — M2) |
| `SAFE_BROWSING_API_KEY` | Google Safe Browsing (future — M1 Step 3) |
| `FRONTEND_ORIGIN` | CORS origin for the frontend (default `http://localhost:5173`) |

---

## License

Private — not yet published.
