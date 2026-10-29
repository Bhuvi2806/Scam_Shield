# Scam Shield 🛡️

**Detect scam messages. Protect your family.**

Scam Shield is a web app where you paste a suspicious SMS, WhatsApp message, or call transcript and get an instant verdict — *Safe*, *Suspicious*, or *Likely Scam* — along with highlighted red flags, a plain-language explanation (Hindi & English), and a clear "what to do now" checklist.

> **Status:** M1 Step 3 — Rule-based detector complete (100% test set accuracy, 0 FN, 0 FP). Ready for LLM layer (M2 Step 4).

---

## API Usage

### Analyze Message: `POST /api/analyze`

Accepts a suspicious message and returns the risk score, verdict, detected red flags with character offsets for UI highlighting, and safety disclaimer. **Processed strictly in-memory; never stored or logged.**

#### Sample Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT: Non-bailable arrest warrant has been issued against you by CBI. You are under digital arrest. Connect on Skype video call."}'
```

#### Sample Response

```json
{
  "score": 65,
  "verdict": "likely_scam",
  "scam_type_guess": "digital arrest",
  "red_flags": [
    {
      "pattern_id": "PAT-001",
      "category": "authority impersonation",
      "matched_text": "CBI",
      "start": 69,
      "end": 72,
      "weight": 5
    },
    {
      "pattern_id": "PAT-002",
      "category": "threats of arrest/disconnection",
      "matched_text": "Non-bailable arrest warrant",
      "start": 8,
      "end": 35,
      "weight": 5
    },
    {
      "pattern_id": "PAT-003",
      "category": "stay on video call",
      "matched_text": "Connect on Skype video call",
      "start": 102,
      "end": 129,
      "weight": 5
    }
  ],
  "disclaimer": "High-risk scam indicators detected! Do not click any links, do not send money, and report immediately to 1930 or cybercrime.gov.in."
}
```

---

## Dataset & Evaluation

Scam Shield uses data-driven rule patterns and a synthetic benchmark dataset:

- **`backend/data/patterns.json`**: 35 validated detection patterns covering all 7 target scam types (`digital arrest`, `fake KYC`, `UPI refund`, `job/task scam`, `lottery/prize`, `electricity-bill threat`, `other`). Each pattern includes dual-script Hindi (Devanagari + Hinglish) and English keywords, regexes, red-flag category, and weight (1-5).
- **`backend/data/test_set.json`**: 70 synthetic labelled messages (35 scam, 35 genuine) in English, Hindi, and Hinglish. Genuine samples include tricky edge cases: genuine bank OTPs with security disclaimers, debit/credit transaction alerts, delivery OTP updates, official electricity bill reminders, and RBI-mandated KYC notifications.
- **Privacy Guaranteed**: Strictly synthetic data with placeholders (`XXXXXXXX`, `example.com`). Zero personal or banking data.

### Running Evaluation

Run the benchmark evaluation script against the test set:

```bash
cd backend
python scripts/evaluate.py
```

Prints accuracy, false positives, false negatives, and a per-scam-type breakdown (message IDs only; never prints message text).

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
│   │   ├── api/              # FastAPI routes (/health, /api/analyze)
│   │   ├── core/             # Config, constants, dataset loaders
│   │   ├── detectors/        # Rule-based detector (rule_detector.py)
│   │   ├── llm/              # LLM integration (future — M2)
│   │   ├── ocr/              # OCR processing (future — M3)
│   │   ├── schemas/          # Pydantic models (dataset.py, analysis.py)
│   │   └── main.py           # App entry point
│   ├── data/
│   │   ├── patterns.json     # 35 scam patterns
│   │   ├── test_set.json     # 70 labelled test messages
│   │   └── README.md         # Dataset guide
│   ├── scripts/
│   │   └── evaluate.py       # Benchmark evaluation script
│   ├── tests/
│   │   ├── test_health.py    # Health endpoint tests
│   │   ├── test_dataset.py   # Dataset schema & integrity tests
│   │   ├── test_rule_detector.py # Detector unit tests
│   │   └── test_api_analyze.py   # /api/analyze route tests
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
