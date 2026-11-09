# Scam Shield 🛡️

**Detect scam messages. Protect your family.**

Scam Shield is a web app where you paste a suspicious SMS, WhatsApp message, or call transcript and get an instant verdict — *Safe*, *Suspicious*, or *Likely Scam* — along with highlighted red flags, a plain-language explanation (Hindi & English), and a clear "what to do now" checklist.

> **Status:** M2 Step 4 — LLM layer (Claude API analysis) complete. Dual rule + LLM analysis with graceful fallback. Ready for Safe Browsing URL check (M2 Step 5).

---

## API Usage

### Analyze Message: `POST /api/analyze`

Accepts a suspicious message and returns both the rule-based risk analysis and Claude LLM analysis (when configured). If the LLM is unavailable or encounters an error, the endpoint gracefully falls back to returning the rule result. **Processed strictly in-memory; never stored or logged.**

#### Sample Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT: Non-bailable arrest warrant has been issued against you by CBI. You are under digital arrest. Connect on Skype video call."}'
```

#### Sample Response

```json
{
  "rule": {
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
  },
  "llm": {
    "verdict": "likely_scam",
    "scam_type": "digital_arrest",
    "red_flags": [
      {
        "category": "authority_impersonation",
        "quote": "CBI",
        "reason": "Impersonating government law enforcement"
      },
      {
        "category": "threats",
        "quote": "Non-bailable arrest warrant has been issued against you",
        "reason": "Threatening arrest to intimidate and induce panic"
      },
      {
        "category": "stay_on_call",
        "quote": "Connect on Skype video call",
        "reason": "Demanding a private video call (classic digital arrest tactic)"
      }
    ],
    "explanation_en": "This message falsely claims to be from the CBI and threatens you with an arrest warrant on Skype. Government and police agencies never arrest people online or conduct investigations over Skype video calls. Never transfer money, share your OTP, or stay on calls with unknown callers.",
    "explanation_hi": "यह संदेश CBI के नाम पर झूठा दावा कर रहा है और स्काइप वीडियो कॉल पर गिरफ़्तारी का डर दिखा रहा है। पुलिस या सरकारी एजेंसियां कभी ऑनलाइन गिरफ़्तार नहीं करतीं और न ही वीडियो कॉल पर पूछताछ करती हैं। किसी अनजान को पैसे न भेजें और न ही OTP बताएं।",
    "confidence": 0.98
  },
  "llm_error": null
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
python scripts/evaluate.py        # Rule-only evaluation (default, no API calls)
python scripts/evaluate.py --llm  # Include Claude LLM evaluation (requires ANTHROPIC_API_KEY)
```

Prints accuracy, false positives, false negatives, and a per-scam-type breakdown (message IDs only; never prints message text). When `--llm` is specified, the script caps at the test set size and prints the exact number of API calls before making them.

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
│   │   ├── llm/              # LLM integration (client.py, prompts.py, analyzer.py)
│   │   ├── ocr/              # OCR processing (future — M3)
│   │   ├── schemas/          # Pydantic models (analysis.py, dataset.py, llm.py)
│   │   └── main.py           # App entry point
│   ├── data/
│   │   ├── patterns.json     # 35 scam patterns
│   │   ├── test_set.json     # 70 labelled test messages
│   │   └── README.md         # Dataset guide
│   ├── scripts/
│   │   └── evaluate.py       # Benchmark evaluation script (--llm supported)
│   ├── tests/
│   │   ├── test_health.py    # Health endpoint tests
│   │   ├── test_dataset.py   # Dataset schema & integrity tests
│   │   ├── test_rule_detector.py # Detector unit tests
│   │   ├── test_api_analyze.py   # /api/analyze route tests
│   │   └── test_llm.py       # LLM schema, prompts, client, and analyzer tests
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

Copy `.env.example` to `.env` and configure:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | `""` | Anthropic Claude API key for LLM analysis |
| `LLM_ENABLED` | `true` | Toggle LLM layer (`true` or `false` for rule-only mode) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Claude model name |
| `LLM_TIMEOUT` | `30` | Request timeout in seconds |
| `LLM_MAX_TOKENS` | `1024` | Maximum tokens for generation |
| `SAFE_BROWSING_API_KEY` | `""` | Google Safe Browsing API key (future — M2 Step 5) |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin for frontend |

---

## License

Private — not yet published.
