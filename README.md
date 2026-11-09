# Scam Shield 🛡️

**Detect scam messages. Protect your family.**

Scam Shield is a web app where you paste a suspicious SMS, WhatsApp message, or call transcript and get an instant verdict — *Safe*, *Suspicious*, or *Likely Scam* — along with highlighted red flags, a plain-language explanation (Hindi & English), and a clear "what to do now" checklist.

> **Status:** M2 Step 5 — URL Checker (Google Safe Browsing & Local Heuristics) complete. Dual concurrent LLM & Safe Browsing analysis with in-memory TTL caching and defanged display URLs. Ready for Score Fusion (M2 Step 6).

---

## API Usage

### Analyze Message: `POST /api/analyze`

Accepts a suspicious message and returns:
1. **Rule Result**: Pattern matches, URL heuristics, and baseline score (always present).
2. **LLM Result**: Semantic classification, scam type, and bilingual explanations from Claude (optional/fallback).
3. **URL Check Result**: Local heuristics + Google Safe Browsing Lookup v4 with in-memory TTL caching and defanged display URLs (optional/fallback).

The LLM and Safe Browsing checks run concurrently via `asyncio`. If any external service is unavailable, rule detection is always returned. **Processed strictly in-memory; never stored or logged.**

#### Sample Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT: SBI account blocked due to incomplete KYC. Update immediately at https://sbi-kyc-verification.com/login"}'
```

#### Sample Response

```json
{
  "rule": {
    "score": 65,
    "verdict": "likely_scam",
    "scam_type_guess": "fake KYC",
    "red_flags": [
      {
        "pattern_id": "HEUR-URL-DECEPTIVE",
        "category": "suspicious link/APK",
        "matched_text": "https://sbi-kyc-verification.com/login",
        "start": 78,
        "end": 116,
        "weight": 4
      },
      {
        "pattern_id": "PAT-006",
        "category": "account blocked threat",
        "matched_text": "account blocked",
        "start": 12,
        "end": 27,
        "weight": 5
      }
    ],
    "disclaimer": "High-risk scam indicators detected! Do not click any links, do not send money, and report immediately to 1930 or cybercrime.gov.in."
  },
  "llm": {
    "verdict": "likely_scam",
    "scam_type": "fake_kyc",
    "red_flags": [
      {
        "category": "threats",
        "quote": "account blocked",
        "reason": "Threatening account suspension to create artificial panic"
      },
      {
        "category": "suspicious_link",
        "quote": "https://sbi-kyc-verification.com/login",
        "reason": "Phishing link imitating official SBI netbanking"
      }
    ],
    "explanation_en": "This message is a fake KYC scam. Banks never threaten immediate account deactivation via SMS or ask you to verify KYC through third-party links.",
    "explanation_hi": "यह संदेश एक फ़र्ज़ी KYC घोटाला है। बैंक कभी भी SMS द्वारा तुरंत खाता बंद करने की धमकी नहीं देते और न ही किसी लिंक पर KYC अपडेट करने को कहते हैं।",
    "confidence": 0.96
  },
  "llm_error": null,
  "url_check": {
    "findings": [
      {
        "url": "hxxps://sbi-kyc-verification[.]com/login",
        "source": "local",
        "status": "suspicious",
        "reasons": ["lookalike_domain"]
      },
      {
        "url": "hxxps://sbi-kyc-verification[.]com/login",
        "source": "safe_browsing",
        "status": "malicious",
        "reasons": ["safe_browsing:SOCIAL_ENGINEERING"]
      }
    ],
    "overall_status": "malicious",
    "error": null
  }
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
│   │   ├── core/             # Config, constants, dataset loaders, url_utils.py
│   │   ├── detectors/        # Rule-based detector, url_checker.py
│   │   ├── llm/              # LLM integration (client.py, prompts.py, analyzer.py)
│   │   ├── ocr/              # OCR processing (future — M3)
│   │   ├── schemas/          # Pydantic models (analysis.py, dataset.py, llm.py, url_check.py)
│   │   └── main.py           # App entry point
│   ├── data/
│   │   ├── patterns.json     # 35 scam patterns
│   │   ├── url_rules.json    # Data-driven URL heuristic rules
│   │   ├── test_set.json     # 74 labelled test messages
│   │   └── README.md         # Dataset guide
│   ├── scripts/
│   │   └── evaluate.py       # Benchmark evaluation script (--llm supported)
│   ├── tests/
│   │   ├── test_health.py    # Health endpoint tests
│   │   ├── test_dataset.py   # Dataset schema & integrity tests
│   │   ├── test_rule_detector.py # Detector unit tests
│   │   ├── test_api_analyze.py   # /api/analyze route tests
│   │   ├── test_llm.py       # LLM schema, prompts, client, and analyzer tests
│   │   └── test_url_checker.py   # URL extraction, defanging, heuristics & Safe Browsing tests
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

### Google Safe Browsing Setup (Free Key)

Scam Shield can check user-submitted links against the Google Safe Browsing Lookup API (v4).

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **Safe Browsing API** (Lookup API v4).
4. Navigate to **APIs & Services > Credentials** and click **Create Credentials > API key**.
5. Add the key to your `.env` file:
   ```bash
   SAFE_BROWSING_API_KEY=your_google_safe_browsing_key_here
   ```

> **Privacy Guarantee:** Only extracted URLs are transmitted to Google's Safe Browsing Lookup API. Scam Shield never transmits message text, sender details, phone numbers, or personal data. User-submitted links are **never fetched, followed, or visited directly**. Displayed URLs are always defanged (`hxxps://example[.]com`) to prevent accidental clicks.

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | `""` | Anthropic Claude API key for LLM analysis |
| `LLM_ENABLED` | `true` | Toggle LLM layer (`true` or `false` for rule-only mode) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Claude model name |
| `LLM_TIMEOUT` | `30` | Request timeout in seconds |
| `LLM_MAX_TOKENS` | `1024` | Maximum tokens for generation |
| `SAFE_BROWSING_API_KEY` | `""` | Google Safe Browsing API v4 key |
| `URL_CHECK_ENABLED` | `true` | Toggle URL check layer (falls back to local heuristics when no key) |
| `SAFE_BROWSING_TIMEOUT` | `5` | Safe Browsing API timeout in seconds |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin for frontend |

---

## License

Private — not yet published.
