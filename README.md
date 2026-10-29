# Scam Shield 🛡️

**Detect scam messages. Protect your family.**

Scam Shield is a web app where you paste a suspicious SMS, WhatsApp message, or call transcript and get an instant verdict — *Safe*, *Suspicious*, or *Likely Scam* — along with highlighted red flags, a plain-language explanation (Hindi & English), and a clear "what to do now" checklist.

> **Status:** M1 Step 1 — Project scaffold complete. No detection logic yet.

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
│   │   ├── core/             # Config, settings
│   │   ├── detectors/        # Rule-based detection (future)
│   │   ├── llm/              # LLM integration (future)
│   │   ├── ocr/              # OCR processing (future)
│   │   ├── schemas/          # Pydantic models
│   │   └── main.py           # App entry point
│   ├── data/
│   │   ├── patterns.json     # Scam patterns (rule layer)
│   │   └── test_set.json     # Labelled test messages
│   ├── tests/
│   │   └── test_health.py
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
