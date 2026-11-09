# Scam Shield 🛡️

**Detect scam messages. Protect your family.**

Scam Shield is a web app where you paste a suspicious SMS, WhatsApp message, or call transcript and get an instant verdict — *Safe*, *Suspicious*, or *Likely Scam* — along with highlighted red flags, a plain-language explanation (Hindi & English), and a clear "what to do now" checklist.

> **Status:** Milestone M2 Complete (Steps 1–7) — Full-stack detection & analysis platform active. Rule detection, Claude API intelligence, Google Safe Browsing URL checks, score fusion, and complete React frontend with highlighted red flags, bilingual explanations, and action checklists. Ready for Milestone M3 (Screenshot OCR & Family Mode).

---

## API Usage

### Analyze Message: `POST /api/analyze`

Accepts a suspicious message and returns:
1. **Final Verdict**: Fused verdict (`safe`, `suspicious`, `likely_scam`), score (0-100), confidence, standardized scam type, merged & de-duplicated red flags, plain-language explanations in English and Hindi (Devanagari), type-specific action checklist, safety disclaimer, and degradation status.
2. **Layer Outputs (`layers`)**: Raw breakdown of individual layers for debugging and detailed UI inspection:
   - **`rule`**: Pattern matches, URL heuristics, and baseline score.
   - **`llm`**: Semantic classification, scam type, and bilingual explanations from Claude (optional/fallback).
   - **`url_check`**: Local heuristics + Google Safe Browsing Lookup v4 with in-memory TTL caching and defanged display URLs (optional/fallback).
   - **`llm_error`**: Null or controlled error message if LLM call failed or timed out.

The LLM and Safe Browsing checks run concurrently via `asyncio`. If any external service is unavailable, the system degrades gracefully without crashing. **Messages are processed strictly in-memory; never stored, logged, or echoed in API responses.**

#### Sample Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT: SBI account blocked due to incomplete KYC. Update immediately at https://sbi-kyc-verification.com/login"}'
```

#### Sample Response

```json
{
  "verdict": {
    "verdict": "likely_scam",
    "score": 88,
    "confidence": 0.93,
    "scam_type": "fake_kyc",
    "red_flags": [
      {
        "category": "suspicious link/APK",
        "quote": "https://sbi-kyc-verification.com/login",
        "start": 78,
        "end": 116,
        "reason": "Detected pattern 'suspicious link/APK' (severity weight 4/5)",
        "source": "rule"
      },
      {
        "category": "account blocked threat",
        "quote": "account blocked",
        "start": 12,
        "end": 27,
        "reason": "Detected pattern 'account blocked threat' (severity weight 5/5)",
        "source": "rule"
      },
      {
        "category": "threats",
        "quote": "account blocked",
        "start": null,
        "end": null,
        "reason": "Threatening account suspension to create artificial panic",
        "source": "llm"
      },
      {
        "category": "suspicious_link",
        "quote": "hxxps://sbi-kyc-verification[.]com/login",
        "start": null,
        "end": null,
        "reason": "URL threat indicator (safe_browsing): safe_browsing:SOCIAL_ENGINEERING",
        "source": "url_safe_browsing"
      }
    ],
    "explanation_en": "This message is a fake KYC scam. Banks never threaten immediate account deactivation via SMS or ask you to verify KYC through third-party links.",
    "explanation_hi": "यह संदेश एक फ़र्ज़ी KYC घोटाला है। बैंक कभी भी SMS द्वारा तुरंत खाता बंद करने की धमकी नहीं देते और न ही किसी लिंक पर KYC अपडेट करने को कहते हैं।",
    "actions": [
      {
        "id": "ACT-KYC-1",
        "priority": 1,
        "step_en": "Do not click any link in the message or fill in banking passwords, PIN, or OTP.",
        "step_hi": "संदेश में दिए गए किसी भी लिंक पर क्लिक न करें और न ही बैंकिंग पासवर्ड, पिन या ओटीपी भरें।"
      },
      {
        "id": "ACT-KYC-2",
        "priority": 2,
        "step_en": "Visit your official bank branch or log in directly via the bank's official mobile app to verify your KYC status.",
        "step_hi": "अपनी बैंक शाखा में स्वयं जाएं या आधिकारिक मोबाइल ऐप से लॉगिन करके ही केवाईसी स्थिति जांचें।"
      },
      {
        "id": "ACT-1930",
        "priority": 3,
        "step_en": "If money was deducted, immediately call 1930 (National Cyber Crime Helpline) within the golden hour to freeze transfers.",
        "step_hi": "यदि बैंक खाते से पैसे कट गए हैं, तो तुरंत 1930 (राष्ट्रीय साइबर हेल्पलाइन) पर कॉल करें।"
      },
      {
        "id": "ACT-CYBERCRIME",
        "priority": 4,
        "step_en": "Report this fraud attempt at cybercrime.gov.in with screenshots and transaction details.",
        "step_hi": "इस धोखाधड़ी की शिकायत cybercrime.gov.in पर स्क्रीनशॉट और विवरण के साथ दर्ज करें।"
      }
    ],
    "disclaimer": "High-risk scam indicators detected! Do not click any links, do not send money, and report immediately to 1930 or cybercrime.gov.in.",
    "sources_used": ["rule", "llm", "url_check"],
    "degraded": false
  },
  "layers": {
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
}
```

---

## Score Fusion Engine & Safety Rules

Scam Shield implements a pure mathematical fusion engine (`backend/app/core/fusion.py`) strictly enforcing the safety principles in `AGENT.md` Section 5:

1. **Never Rely on the LLM Alone**: If only the LLM flags a message as `likely_scam` while rule detection and URL intelligence show zero threats, the verdict is capped at `suspicious` (score capped at 55).
2. **Malicious URL Override**: A confirmed malicious Google Safe Browsing match immediately escalates the final verdict to `likely_scam` (minimum score 85).
3. **Asymmetric URL Weighting**: Safe Browsing is a threat blocklist. The absence of a bad link or a clean URL does not prove innocence (many scams contain zero links or fresh domains). A clean URL lookup never suppresses positive rule or LLM detections.
4. **Lean Suspicious on Disagreement**: If any layer detects scam indicators while others are clean, or if confidence is low, the verdict leans `suspicious`, never `safe`.
5. **Strict Safe Verdict Requirements**: A `safe` verdict is allowed **only** when the rule detector is clean, the LLM (if available) confirms clean, no URLs are flagged, and the analysis is not degraded. It must always display the lowest-risk disclaimer:
   > *"No red flag found, but never share OTP, PIN or money with anyone who contacts you."*
6. **Never "100% Safe"**: Confidence is capped at 0.95. Language claiming "100% safe" or "completely safe" is filtered from all user-facing output.
7. **Graceful Degraded Fallback**: If external APIs (Claude LLM or Google Safe Browsing) timeout or fail, the system falls back to rule detection with `degraded=true`. When degraded and rules are clean, the system leans `suspicious` noting that deeper analysis was temporarily unavailable.

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
python scripts/evaluate.py           # Rule-only evaluation (default, no API calls)
python scripts/evaluate.py --fusion  # Fused multi-layer evaluation (offline simulated LLM + Safe Browsing)
python scripts/evaluate.py --llm     # Include Claude LLM evaluation (requires ANTHROPIC_API_KEY)
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
│   │   ├── core/             # Config, constants, fusion.py, dataset loaders, url_utils.py
│   │   ├── detectors/        # Rule-based detector, url_checker.py
│   │   ├── llm/              # LLM integration (client.py, prompts.py, analyzer.py)
│   │   ├── ocr/              # OCR processing (future — M3)
│   │   ├── schemas/          # Pydantic models (analysis.py, dataset.py, llm.py, url_check.py, verdict.py)
│   │   └── main.py           # App entry point
│   ├── data/
│   │   ├── actions.json      # Type-specific "what to do now" action checklists
│   │   ├── explanations.json # Fallback bilingual explanation templates
│   │   ├── patterns.json     # 35 scam patterns
│   │   ├── url_rules.json    # Data-driven URL heuristic rules
│   │   ├── test_set.json     # 74 labelled test messages
│   │   └── README.md         # Dataset guide
│   ├── scripts/
│   │   └── evaluate.py       # Benchmark evaluation script (--fusion and --llm supported)
│   ├── tests/
│   │   ├── test_health.py    # Health endpoint tests
│   │   ├── test_dataset.py   # Dataset schema & integrity tests
│   │   ├── test_rule_detector.py # Detector unit tests
│   │   ├── test_api_analyze.py   # /api/analyze route tests
│   │   ├── test_llm.py       # LLM schema, prompts, client, and analyzer tests
│   │   ├── test_url_checker.py   # URL extraction, defanging, heuristics & Safe Browsing tests
│   │   └── test_fusion.py    # Score fusion engine, safety rules & edge case tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── __tests__/        # Vitest & React Testing Library test suites
│   │   │   ├── fixtures.js
│   │   │   ├── highlighting.test.jsx
│   │   │   ├── integration.test.jsx
│   │   │   └── verdict.test.jsx
│   │   ├── components/       # UI components (VerdictCard, HighlightedMessage, RedFlagList, ExplanationPanel, ActionChecklist, DisclaimerBanner, LoadingState, ErrorState, SampleMessages)
│   │   ├── pages/            # HomePage with accessible input card and live screen-reader announcer
│   │   ├── hooks/            # useAnalyze state & lifecycle hook
│   │   ├── lib/api.js        # Backend API client with timeout and error mapping
│   │   ├── App.jsx           # Responsive layout with calm header and privacy footer
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js        # Dev server proxy configuration
│   └── vitest.config.js      # Testing configuration
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

Opens at **http://localhost:5173**. To run frontend tests and linting:

```bash
npm test        # Run Vitest test suite
npm run lint    # Run ESLint
npm run build   # Production build verification
```

### Privacy & Security Guarantees

- **Processed strictly in-memory**: Neither the user's submitted message nor the analysis result is ever stored in `localStorage`, `sessionStorage`, cookies, query parameters, or client/server log files.
- **XSS Defense**: The message highlighter renders strictly through React text nodes and `<mark>` elements (zero `dangerouslySetInnerHTML`), immunizing the UI against malicious script injection.
- **Defanged URLs**: Suspicious or malicious links detected in messages are always defanged (`hxxps://...`, `[.]`) and are never rendered as clickable hyperlinks.

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
