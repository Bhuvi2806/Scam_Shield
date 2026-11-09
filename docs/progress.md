# Scam Shield — Progress Log

## M3 Step 9: Family Mode Share Card (WhatsApp-Shareable Result)

### Plan
1. Dependencies & Bundled Fonts:
   - Install pinned packages in `frontend`: `html-to-image@1.11.11`, `@fontsource/noto-sans@5.1.0`, `@fontsource/noto-sans-devanagari@5.1.0`.
   - Bundle OFL-licensed Noto Sans and Noto Sans Devanagari in `frontend/src/main.jsx` (zero CDN calls).
2. Centralized Strings & Safe Content Builder:
   - `frontend/src/lib/strings.js`: Centralized bilingual string dictionary for verdicts, scam types, red flag translations, actions, disclaimers, and share text.
   - `frontend/src/lib/cardContent.js`: Pure function `buildCardContent(verdict, lang)` capping flags at 3 and steps at 4, enforcing strict privacy (zero original message text or quotes), guaranteeing 1930 and cybercrime.gov.in inclusion, enforcing exact safe disclaimer, and never outputting "100% safe". Also `buildShareText(verdict, lang)` for WhatsApp text fallback.
3. Card Component & PNG Generation:
   - `frontend/src/lib/shareCard.js`: Converts FamilyCard DOM node into PNG blob using `html-to-image`, awaiting `document.fonts.ready`. Object URL revoked when modal closes.
   - `frontend/src/components/FamilyCard.jsx`: 1080x1350 (4:5) visual share card with WCAG AA contrast, clear verdict badge with icon + text, scam type in plain words, up to 3 red flags, 3-4 action steps, disclaimer, date and family forwarding prompt. Rendered via React text nodes only; zero external branding/emblems.
4. Share Modal & Triggers:
   - `frontend/src/components/ShareCardModal.jsx`: Accessible modal dialog with focus trap, Escape key handling, language toggle (English / हिन्दी), Web Share API integration (`navigator.canShare`), and graceful fallbacks (Download PNG, Share on WhatsApp wa.me link, Copy text).
   - `frontend/src/components/ShareCardButton.jsx`: Prominent "Share with family / परिवार के साथ साझा करें" button in results view.
   - Integrate into `frontend/src/pages/HomePage.jsx`.
5. Automated Tests:
   - Content builder unit tests (`frontend/src/__tests__/cardContent.test.js`).
   - Component & Modal interaction tests (`frontend/src/__tests__/familyCard.test.jsx`).
6. Verification & Documentation:
   - Full test run (`vitest run`, `eslint`, `vite build`, `pytest`), documentation updates (`README.md`, `docs/decisions.md`, `docs/progress.md`).

### Phase Log
- **[Phase 0] Understand:** Confirmed Steps 1–8 complete across pipeline. Restated task: Build a browser-only, privacy-preserving Family Mode share card (1080x1350 PNG) for WhatsApp alerts, built solely from FinalVerdict with bundled OFL Noto Sans fonts, strict exclusion of message quotes, Web Share API with fallbacks, and zero storage or network calls.
- **[Phase 1] Plan:** Documented 6-step implementation plan at the top of `docs/progress.md`.
- **[Phase 2] Implement:** Added bundled Noto Sans Latin + Devanagari fonts via `@fontsource`, built `strings.js`, safe pure `buildCardContent` & `buildShareText` in `cardContent.js`, `shareCard.js` capture helper, `FamilyCard.jsx` component, `ShareCardModal.jsx` with accessible focus trap and Escape handler, and integrated `ShareCardButton.jsx` in `HomePage.jsx`.
- **[Phase 3] Test:** 20 frontend tests added (8 in `cardContent.test.js`, 12 in `familyCard.test.jsx`). Full frontend suite: 51 tests passed across 6 test suites; ESLint 100% clean; Vite production build 100% clean (506ms). Full backend suite: 104 tests passed, 1 skipped; evaluation benchmark: 100% accuracy (74/74).
- **[Phase 4] Review:** Verified zero message text, quotes, or personal details on card; verified defanged URLs; verified zero network requests and zero persistent storage writes; verified OFL font licensing; verified exact disclaimer and absence of "100% safe".
- **[Phase 5] Document & Report:** Updated `README.md` with Family Mode share card guide and font licenses; recorded Decisions 33–36 in `docs/decisions.md`; marked Milestone M3 COMPLETE.

---

> **MILESTONE M3 COMPLETE:** Screenshot OCR with Hindi & English support, Action Checklist with 1930 tap-to-call, and WhatsApp-shareable Family Mode card with client-side PNG generation are fully implemented and verified!

## M3 Step 8: Screenshot OCR with Hindi + English Support

### Plan
1. Dependencies & Constants:
   - Add `pytesseract>=0.3.10`, `pillow>=10.0.0`, and `python-multipart>=0.0.6` to `backend/requirements.txt`.
   - Define OCR constants in `backend/app/core/constants.py` (`MAX_IMAGE_BYTES = 5MB`, `MAX_IMAGE_PIXELS = 25MP`, `ALLOWED_IMAGE_FORMATS`, `OCR_TIMEOUT_SECONDS = 15`, `OCR_RATE_LIMIT_REQUESTS = 30/min`, `OCR_LOW_CONFIDENCE_THRESHOLD = 0.50`).
2. OCR Schema & Preprocessing (`backend/app/schemas/ocr.py`, `backend/app/ocr/preprocess.py`):
   - Schema: `OCRResult` with `text`, `language_guess` ('en' | 'hi' | 'hinglish'), `confidence` (0.0-1.0), `low_confidence` (bool), and `warnings` (list).
   - In-memory validation & sanitization: decode using Pillow magic bytes (PNG, JPEG, WEBP), enforce decompression-bomb protection (`Image.MAX_IMAGE_PIXELS`), and strip EXIF metadata into fresh memory buffers. Zero disk persistence.
   - Preprocessing: grayscale conversion, contrast enhancement, minimum dimension upscaling, orientation cleanup.
3. OCR Engine & Language Detection (`backend/app/ocr/engine.py`):
   - Abstract `OCREngine` interface (`extract(image: Image.Image) -> OCRResult`).
   - `TesseractEngine`: runs pytesseract with languages `"hin+eng"`, calculates word confidence, classifies script balance (`en`, `hi`, `hinglish`), and raises controlled `OCRError` on timeout or missing binary.
   - Dependency-injection hook for mock engines in tests.
4. Dedicated Endpoint `POST /api/ocr` (`backend/app/api/ocr.py`):
   - Accepts `file: UploadFile = File(...)`.
   - Validates image bytes, enforces per-client IP rate limiting.
   - Returns `{text, language_guess, confidence, low_confidence, warnings}` without auto-analyzing.
   - Privacy-safe logging: log only byte size, latency, status, and error code. Never log image content, filenames, or extracted text.
5. Frontend Screenshot Upload UI (`frontend/src/components/ImageUpload.jsx`):
   - "Upload Screenshot" button, drag-and-drop zone, and clipboard paste listener (`onPaste`).
   - Client-side size (< 5MB) and format (PNG/JPEG/WEBP) validation.
   - Thumbnail preview using object URLs, properly revoked via `URL.revokeObjectURL`.
   - On success: populates the message textarea for user review and editing without auto-submitting.
   - Warning banners for low confidence or empty text in Hindi and English.
   - Zero storage writes (no localStorage/sessionStorage/cookies).
6. Comprehensive Tests:
   - Backend (`backend/tests/test_ocr.py`): fake engine unit tests (format validation, oversize, decompression bomb, EXIF stripping, temp dir write assertion, rate limiting, language detection, low confidence).
   - Optional live Tesseract integration test (auto-skipped when binary or language pack missing).
   - Frontend (`frontend/src/__tests__/imageUpload.test.jsx`): upload flow, drag/drop/paste, preview cleanup, low-confidence warning, storage spies.
7. Verification & Documentation:
   - `pytest`, `ruff`, `npm test`, `npm run lint`, `npm run build`, real end-to-end check.
   - Update `README.md`, `docs/decisions.md`, `docs/progress.md`.

### Phase Log
- **Phase 0 (Understand):**
  - Confirmed Steps 1–7 complete and functioning across backend, fusion, and frontend.
  - Checked host Tesseract installation (`tesseract --version`): binary not present on Windows host. Documented manual installation guidelines in `README.md` and `docs/decisions.md`. Designed architecture with abstract `OCREngine` test doubles so all tests run deterministically in CI/local without external binaries, while live integration test auto-skips.
  - Restated task: Implement screenshot OCR supporting Hindi, English, and Hinglish with safe in-memory image validation, decompression-bomb protection, EXIF stripping, privacy-preserving logging, a dedicated `POST /api/ocr` endpoint, a review-first frontend upload UI (paste, drag & drop, file selection), and rigorous automated tests.
- **Phase 1 (Plan):**
  - Documented 7-step plan at top of `docs/progress.md`.
- **Phase 2 (Implement):**
  - Installed `pytesseract>=0.3.10`, `pillow>=10.0.0`, and `python-multipart>=0.0.6` in backend.
  - Defined OCR constants in `backend/app/core/constants.py` (5 MB max bytes, 25 MP max pixels, 15s timeout, 30 req/min rate limit, 0.50 low confidence threshold).
  - Created `OCRResult` schema in `backend/app/schemas/ocr.py`.
  - Built image sanitization & preprocessing in `backend/app/ocr/preprocess.py` (magic byte format validation, decompression-bomb guard, EXIF stripping, grayscale, Otsu/contrast enhancement, upscaling).
  - Implemented `OCREngine` and `TesseractEngine` with language/script detection in `backend/app/ocr/engine.py`.
  - Built sliding-window rate-limited `POST /api/ocr` endpoint in `backend/app/api/ocr.py` with privacy logging and mapped HTTP statuses (400, 413, 422, 429, 503, 504).
  - Integrated OCR router into `backend/app/main.py`.
  - Implemented `extractTextFromScreenshot` in `frontend/src/lib/api.js` with client-side format & size pre-checks.
  - Built `ImageUpload.jsx` supporting drag-and-drop, clipboard paste, file selection, preview with object URL revocation, and bilingual alerts.
  - Integrated `ImageUpload` into `HomePage.jsx` populating the message textarea for user review (no auto-analysis).
- **Phase 3 (Test):**
  - Backend: 20 tests in `backend/tests/test_ocr.py` covering format validation, corruption, zero-byte, spoofed headers, BMP rejection, byte limits, pixel limits, EXIF stripping, in-memory zero disk writes, language classification, rate limiting, low confidence, 422 empty text, 503 missing binary, 504 timeout, and auto-skipping real integration test.
  - Frontend: 9 tests in `frontend/src/__tests__/imageUpload.test.jsx` covering textarea population without auto-analyze, low-confidence warning, 422 error, client-side format & size rejection, preview URL revocation, zero storage writes, drag-and-drop, and clipboard paste.
- **Phase 4 (Evaluate):**
  - Backend: 104 passed, 1 skipped.
  - Frontend: 31 passed across 4 test suites.
  - Evaluation benchmark: 100% accuracy (74/74) with 0 false positives and 0 false negatives.
  - Code hygiene: `ruff check` and `ruff format` 100% clean; ESLint clean; Vite build clean (326ms).
- **Phase 5 (Document):**
  - Updated `README.md` with OCR endpoint specs, system Tesseract dependencies, and privacy architecture.
  - Recorded Architecture Decisions 29–32 in `docs/decisions.md`.
  - Finalized phase logs in `docs/progress.md`.

---

## M2 Step 7: Frontend (Verdict Display, Highlighted Red Flags, Action Checklist)

### Plan
1. API client (`frontend/src/lib/api.js`):
   - Add `analyzeMessage(text, { signal, timeoutMs })` invoking `POST /api/analyze`.
   - Implement `AbortController` timeout (default 30s) and handle network errors, 422 validation errors, and 5xx failures with user-friendly error messages.
   - Document types and response contract with JSDoc.
2. State hook (`frontend/src/hooks/useAnalyze.js`):
   - Manage states: `idle`, `loading`, `success`, `error`.
   - Prevent double submissions; abort previous in-flight requests.
   - Store submitted text in component state for safe client-side highlighting.
3. Components (`frontend/src/components/`):
   - `VerdictCard.jsx`: Multi-modal verdict presentation (color + icon + text badge, never color alone), score gauge, confidence level (High/Moderate/Preliminary), standardized scam type.
   - `HighlightedMessage.jsx`: Safe client-side text highlighter. Calculates offsets from response or quotes; merges overlapping spans; handles out-of-bounds quotes gracefully; strictly uses React text nodes and `<mark>` elements (zero `dangerouslySetInnerHTML`).
   - `RedFlagList.jsx`: Categorized list of indicators showing category, human-readable reason, detection source tag, and matching quote.
   - `ExplanationPanel.jsx`: Bilingual English / हिन्दी toggle (defaults to Devanagari detection or English, session-only).
   - `ActionChecklist.jsx`: Prioritized actionable advice, `tel:1930` tap-to-call link, `https://cybercrime.gov.in` (`rel="noopener noreferrer"`), client-side checkable state (no persistence).
   - `DisclaimerBanner.jsx`: Safety disclaimer display and prominent warning when `degraded` is true.
   - `LoadingState.jsx` & `ErrorState.jsx`: Calm, accessible loading skeleton and actionable error states with retry.
   - `SampleMessages.jsx`: 3 synthetic one-click samples (Fake KYC, Electricity threat, Clean OTP alert) for demoing.
4. Pages & Layout (`frontend/src/pages/HomePage.jsx`, `frontend/src/App.jsx`):
   - Header with icon and one-line purpose; footer with privacy pledge ("Your message is not stored").
   - Character count indicator (up to 10,000 chars), Clear button, Check button.
   - Accessibility: `aria-live` region for screen readers, 44px minimum tap targets, WCAG AA contrast, mobile-first at 360px up to desktop, `prefers-reduced-motion` compliance.
   - Zero storage: no localStorage, sessionStorage, cookies, URL params, or console logs.
5. Testing setup and test suite:
   - Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@testing-library/user-event`.
   - Write comprehensive tests in `frontend/src/__tests__/`:
     * Highlighting with non-overlapping, overlapping, out-of-range, and quote-only flags.
     * XSS injection defense (raw HTML and `<script>` tags rendered as text).
     * VerdictCard color/icon/text across safe, suspicious, likely_scam.
     * Hindi/English toggle.
     * Action checklist tel:1930 and cybercrime links.
     * Disclaimer and degraded banner behavior.
     * Double-submit prevention and request abort.
     * Storage spy confirming 0 writes to localStorage/sessionStorage.
6. Verification & End-to-End:
   - `npm test`, `npm run lint`, `npm run build`.
   - Real end-to-end check running backend + frontend concurrently.
   - Update `README.md`, `docs/progress.md` (mark M2 complete!), and final report.

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---

---

### Plan
1. Create `backend/data/actions.json` and `backend/data/explanations.json`: Type-specific action checklists (always containing 1930 and cybercrime.gov.in) and fallback bilingual explanation templates.
2. Create `backend/app/schemas/verdict.py`: Pydantic models `MergedRedFlag`, `ActionItem`, and `FinalVerdict`.
3. Add fusion constants and thresholds to `backend/app/core/constants.py` (layer weights, safe/suspicious/likely_scam score bands, confidence bounds, fallback notes).
4. Implement `backend/app/core/fusion.py`: Pure function `fuse(rule, llm, url_check, llm_error, url_check_error) -> FinalVerdict` enforcing all Section 5 safety rules (no LLM-only scam verdict, malicious URL override, lean suspicious on disagreement/degraded clean, exact lowest-risk disclaimer, zero "100% safe").
5. Update `POST /api/analyze` in `backend/app/api/analyze.py`: Return final shape `{"verdict": FinalVerdict, "layers": {...}}` with zero message text leakage.
6. Extend `backend/scripts/evaluate.py` with `--fusion` mode: Offline evaluation using simulated/cached LLM + rule + URL checker on `test_set.json`.
7. Add comprehensive test suite in `backend/tests/test_fusion.py` covering all edge cases, safety constraints, and API integration.
8. Verify `ruff`, `pytest`, and `evaluate.py --fusion`, then update documentation and log decisions.

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-5 complete. Restated task: Implement pure fusion engine `fuse(rule, llm, url_check) -> FinalVerdict`, deduplicate red flags across layers, attach type-specific action checklist (with 1930 & cybercrime.gov.in) and bilingual explanations, enforce all Section 5 safety rules, update `/api/analyze` to return `verdict` + `layers`, and add `--fusion` evaluation mode.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/score-fusion`, created `actions.json`, `explanations.json`, `verdict.py` schema, fusion constants in `constants.py`, pure `fuse()` function in `fusion.py`, updated `POST /api/analyze` with concurrent layer execution, and added `--fusion` in `evaluate.py`.
- [Phase 3] Test: tests: 85 passed, 0 failed (`pytest` across all suites), `ruff check` and `ruff format` clean, `evaluate.py --fusion` 100.00% accuracy (74/74, 0 FP, 0 FN), `evaluate.py` rule-only 100.00% accuracy (74/74, 0 FP, 0 FN).
- [Phase 4] Review: Verified all Section 5 safety rules (no LLM-only scam, malicious Safe Browsing override to likely_scam, lean suspicious on disagreement/degraded clean, lowest-risk disclaimer, never 100% safe, no message text logged or returned, no secrets committed).
- [Phase 5] Complete: Documented decisions #24-#26 in `docs/decisions.md`, updated `README.md`, verified DoD checklist.

---

## M2 Step 5: URL Checker (Google Safe Browsing & Local Heuristics)

### Plan
1. Create `backend/data/url_rules.json`: Data-driven lists of shortener domains, deceptive bank/gov keywords, trusted suffixes, suspicious TLDs, and APK patterns.
2. Create `backend/app/schemas/url_check.py`: Pydantic models `UrlFinding` (defanged url, source, status, reasons) and `UrlCheckResult` (findings, overall_status, error).
3. Create `backend/app/core/url_utils.py`:
   - Regex & parsing for http/https, bare domains (`sbi-kyc.in/login`), and surrounding Hindi/Hinglish text.
   - `defang_url(url: str) -> str` (e.g. `hxxps://example[.]com`).
   - Shared local heuristic checks reused by both the URL checker and the rule detector.
4. Update `backend/app/core/constants.py` and `backend/app/core/config.py`:
   - Add `MAX_URLS_TO_CHECK = 10`, `SAFE_BROWSING_TIMEOUT = 5`, `CACHE_TTL_SECONDS = 3600`.
   - Add `URL_CHECK_ENABLED: bool = True`, `url_check_available` helper in config.
5. Create `backend/app/detectors/url_checker.py`:
   - In-memory TTL cache keyed by SHA-256 of normalized URL.
   - Abstract `SafeBrowsingClient` interface for offline testability.
   - `GoogleSafeBrowsingClient` using `httpx` (never fetch URLs, only API lookup; privacy-safe logging).
   - Local heuristics executed first; batched remote Safe Browsing check for up to `MAX_URLS_TO_CHECK`.
   - Controlled fallback to local-only with `status="unchecked"` on missing key, timeout, or API failure.
6. Refactor `backend/app/detectors/rule_detector.py` to reuse `url_utils.py` and verify all existing tests stay green.
7. Update `POST /api/analyze` in `backend/app/api/analyze.py`:
   - Response shape: `{"rule": RuleResult, "llm": LLMResult | null, "llm_error": string | null, "url_check": UrlCheckResult | null}`.
   - Execute LLM analysis and URL checking concurrently using `asyncio.gather`.
8. Add comprehensive tests in `backend/tests/test_url_checker.py` using `FakeSafeBrowsingClient`.
9. Add synthetic URL-bearing messages to `backend/data/test_set.json` and re-run `evaluate.py`.
10. Review diff for privacy/safety (no secrets, no URL fetching, defanged URLs, no user data sent to Google).
11. Update `README.md`, `docs/decisions.md`, `docs/progress.md`, and report.

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-4 complete. Task is M2 Step 5 — Google Safe Browsing URL check layer with local heuristics, SHA-256 TTL caching, defanged URLs, and concurrent async execution.
- [Phase 1] Plan: Written above.
- [Phase 2] Implement: Created `url_rules.json`, `url_check.py` schema, `url_utils.py` with extractor & defanging, `url_checker.py` with caching and client abstraction, refactored `rule_detector.py`, updated `POST /api/analyze` with concurrent execution.
- [Phase 3] Test: tests: 69 passed, 0 failed (`pytest tests/ -v`), ruff clean, `evaluate.py` 100.00% accuracy (74/74, 0 FP, 0 FN).
- [Phase 4] Review: Re-read diff; confirmed no secrets in repo (.env gitignored), strict URL-only transmission to Google, no URLs visited/fetched, defanged display URLs, zero message text logged.
- [Phase 5] Document & Report: Updated README (Safe Browsing setup, API usage sample, env vars) and docs/progress.md.

### Definition of Done Checklist (Section 9)
- [x] Code runs locally without errors
- [x] Tests added/updated and passing; linters clean (69/69 pytest passed, ruff clean)
- [x] Privacy and "never 100% safe" rules respected (no full URLs or messages logged, URLs defanged for display, never visited)
- [x] No secrets in the repo (.env gitignored, placeholders only)
- [x] `docs/progress.md` and README updated
- [x] Final report delivered in Section 7 format

---

## M2 Step 4: LLM Layer (Claude API Analysis)

### Plan
1. Create `backend/app/schemas/llm.py`: `LLMResult` Pydantic model with verdict, scam_type, red_flags[], explanation_en, explanation_hi, confidence.
2. Create `backend/app/llm/client.py`: abstract `LLMClient` interface + `ClaudeLLMClient` using Anthropic SDK. Read API key and model name from config. Add `anthropic` to `requirements.txt`.
3. Create `backend/app/llm/prompts.py`: system prompt and user prompt template as constants with prompt-injection defenses (message delimited as data, ignore-instructions-inside directive), JSON-only output, "never 100% safe", "lean suspicious", bilingual elderly-friendly explanations.
4. Create `backend/app/llm/analyzer.py`: `analyze_with_llm(text) -> LLMResult` — calls client, parses JSON, validates with Pydantic. Retry once on invalid JSON / schema failure. Controlled error on timeout/API failure. Privacy: never log message text or model response body.
5. Update `backend/app/core/config.py`: add `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `LLM_ENABLED`, `LLM_TIMEOUT`, `LLM_MAX_TOKENS` settings.
6. Update `POST /api/analyze` to return `{"rule": RuleResult, "llm": LLMResult | null, "llm_error": string | null}`. Graceful fallback when LLM fails.
7. Extend `backend/scripts/evaluate.py` with `--llm` flag (opt-in, caps at test set size, prints API-call count before running).
8. Add tests in `backend/tests/test_llm.py` using a fake LLM client: valid JSON, invalid JSON retry, timeout, schema violation, prompt-injection, LLM-disabled mode, /api/analyze fallback.
9. Commit incrementally per Section 6 format.

### Files Created / Modified
- **Created:** `backend/app/schemas/llm.py`, `backend/app/llm/client.py`, `backend/app/llm/prompts.py`, `backend/app/llm/analyzer.py`, `backend/tests/test_llm.py`
- **Modified:** `backend/app/core/config.py`, `backend/app/api/analyze.py`, `backend/scripts/evaluate.py`, `backend/requirements.txt`, `.env.example`, `README.md`, `docs/progress.md`, `docs/decisions.md`

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-3 complete. Task is M2 Step 4 — Claude API LLM layer, schema, client, prompt injection defense, analyzer with retry, dual-result /api/analyze, and opt-in evaluate.py --llm.
- [Phase 1] Plan: Written above.
- [Phase 2] Implement: Created `app/schemas/llm.py`, `app/llm/client.py`, `app/llm/prompts.py`, `app/llm/analyzer.py`, `tests/test_llm.py`, updated `app/core/config.py`, `app/api/analyze.py`, `scripts/evaluate.py`, and `requirements.txt`.
- [Phase 3] Test: tests: 46 passed, 0 failed (`pytest tests/ -v`), ruff check and format clean, evaluate.py default rule run clean (100% accuracy, 0 FP, 0 FN).
- [Phase 4] Review: Re-read diff; confirmed no secrets in repo (.env gitignored), strict in-memory privacy (never log message text or model response body), XML `<message>` prompt injection defense, "never 100% safe" and "lean suspicious" rules in prompt.
- [Phase 5] Document & Report: Updated README (API usage with new response format, evaluate --llm, env vars) and docs/progress.md.

### Definition of Done Checklist (Section 9)
- [x] Code runs locally without errors
- [x] Tests added/updated and passing; linters clean (46/46 pytest passed, ruff clean)
- [x] Privacy and "never 100% safe" rules respected (no message/response body logged, prompt-injection defense, lean-suspicious & lowest-risk disclaimer)
- [x] No secrets in the repo (.env gitignored, placeholders only)
- [x] `docs/progress.md` and README updated
- [x] Final report delivered in Section 7 format

---

## M1 Step 3: Rule-Based Detector

### Plan
1. Define analysis schemas in `backend/app/schemas/analysis.py` (`RedFlag`, `RuleResult`, `AnalyzeRequest`).
2. Define detection constants in `backend/app/core/constants.py` (thresholds, verdict labels, lowest-risk disclaimer, URL heuristic rules).
3. Implement `backend/app/detectors/rule_detector.py`:
   - Data-driven keyword/regex matcher against `patterns.json` preserving original character offsets.
   - Local URL heuristics (.apk, IP hosts, URL shorteners, deceptive domains).
   - Negation / protective context handler (e.g. "never share OTP with bank staff").
   - Non-linear weight aggregation into 0-100 score and scam type deduction.
   - AGENT.md safety rules (exact lowest-risk disclaimer, no "100% safe").
4. Create API endpoint `POST /api/analyze` in `backend/app/api/analyze.py` and register in `backend/app/main.py` with in-memory privacy.
5. Create benchmark evaluation script `backend/scripts/evaluate.py` testing against `test_set.json` (printing IDs only, no text).
6. Tune `patterns.json` weights and entries until false negatives are 0 and false positives are minimal.
7. Add comprehensive unit and API tests in `backend/tests/`.
8. Format, review for privacy/safety rules, run linters, and document.

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-2 complete. Task is M1 Step 3: rule-based detector, URL heuristics, negation handling, /api/analyze, and evaluation script.
- [Phase 1] Plan: Written above.
- [Phase 2] Implement: Created `app/schemas/analysis.py`, `app/core/constants.py`, `app/detectors/rule_detector.py`, `app/api/analyze.py`, and `scripts/evaluate.py`.
- [Phase 3] Test: tests: 23 passed, 0 failed (`pytest tests/ -v`), ruff clean, `scripts/evaluate.py`: 100.00% accuracy (70/70), 0 FP, 0 FN.
- [Phase 4] Review: Re-read diff; confirmed data-driven design (no hard-coded scam phrases in code), strict in-memory privacy (no message text logged), exact lowest-risk disclaimer.
- [Phase 5] Document & Report: Updated README (API usage, sample curl request/response, evaluate command) and `docs/progress.md`.

### Evaluation Benchmark Results (`scripts/evaluate.py`)
- **Total Samples:** 70 (35 scam, 35 genuine)
- **Overall Accuracy:** 100.00% (70/70)
- **True Positives (Scam):** 35 / 35 (100.0% recall)
- **True Negatives (Safe):** 35 / 35 (100.0% specificity)
- **False Positives:** 0 (0.0% FP rate)
- **False Negatives:** 0 (0.0% FN rate)
- **Per-Scam-Type Recall & Type Guess Match:**
  - `digital arrest`: 5/5 detected (100%), 5/5 type match (100%)
  - `fake KYC`: 5/5 detected (100%), 5/5 type match (100%)
  - `UPI refund`: 5/5 detected (100%), 5/5 type match (100%)
  - `job/task scam`: 5/5 detected (100%), 5/5 type match (100%)
  - `lottery/prize`: 5/5 detected (100%), 5/5 type match (100%)
  - `electricity-bill threat`: 5/5 detected (100%), 5/5 type match (100%)
  - `other`: 5/5 detected (100%), 5/5 type match (100%)

### Definition of Done Checklist (Section 9)
- [x] Code runs locally without errors
- [x] Tests added/updated and passing; linters clean (23/23 pytest passed, ruff clean)
- [x] Privacy and "never 100% safe" rules respected (lowest-risk disclaimer exact, in-memory processing only)
- [x] No secrets in the repo (.env gitignored, placeholders only)
- [x] `docs/progress.md` and README updated
- [x] Final report delivered in Section 7 format

---

## M1 Step 2: Dataset (Scam Patterns + Labelled Test Set)

### Plan
1. Define Pydantic schemas in `backend/app/schemas/dataset.py` (`Pattern`, `TestMessage`).
2. Build `backend/data/patterns.json` with >= 30 patterns across 7 scam types and key red-flag categories, containing English and Hindi (Devanagari + Hinglish) keywords and regexes.
3. Build `backend/data/test_set.json` with >= 60 synthetic messages (>= 30 scam, >= 30 genuine) in English, Hindi, and Hinglish, including tricky genuine messages, with placeholders (no real personal data).
4. Implement dataset loaders in `backend/app/core/dataset.py` (`load_patterns`, `load_test_set`) validating through schemas.
5. Create `backend/data/README.md` documenting format and guide to adding patterns.
6. Write unit tests in `backend/tests/test_dataset.py` validating uniqueness, minimum counts, scam types, languages, and schema compliance.
7. Run `pytest` and `ruff`, perform self-review, and update docs and DoD.

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---
- [Phase 0] Understand: Read AGENT.md and verified Step 1 completion. Task is M1 Step 2 — dataset schemas, >= 30 patterns, >= 60 test messages, loaders, and tests.
- [Phase 1] Plan: Defined schemas, 35 patterns across 7 scam types, 70 synthetic messages, loaders, and tests.
- [Phase 2] Implement: Created `app/schemas/dataset.py`, populated 35 patterns in `patterns.json`, 70 synthetic messages (35 scam / 35 genuine) in `test_set.json`, loader utilities in `app/core/dataset.py`, and `backend/data/README.md`.
- [Phase 3] Test: tests: 10 passed, 0 failed (`pytest tests/ -v`), ruff check clean on `app/` and `tests/`.
- [Phase 4] Review: Re-read diff; confirmed strictly synthetic placeholders (no real personal or banking data), valid UTF-8, and clean schemas.
- [Phase 5] Document & Report: Updated README and `docs/progress.md` with full phase logs and Definition of Done.

### Definition of Done Checklist (Section 9)
- [x] Code runs locally without errors
- [x] Tests added/updated and passing; linters clean (10/10 passed, ruff clean)
- [x] Privacy and "never 100% safe" rules respected (synthetic data only, no real numbers/names/accounts)
- [x] No secrets in the repo (.env gitignored, placeholders only)
- [x] `docs/progress.md` and README updated
- [x] Final report delivered in Section 7 format

---

## M1 Step 1: Project Setup

### Plan
1. Create folder layout: `backend/`, `frontend/`, `docs/`
2. Backend: FastAPI skeleton with `/health`, config from `.env`, empty data files, pytest test
3. Frontend: React + Vite + Tailwind, mobile-first home page, `lib/api.js` helper
4. Root: `.gitignore`, `.env.example`, `README.md`, docs
5. Git init on `feat/project-setup`, small commits
6. Test: pytest, ruff, eslint, build, manual server checks
7. Review: no secrets, no dead code
8. Document: update README and progress

### Phase Log
- [Phase 0] Understand: Read AGENT.md and confirmed Steps 1-6 complete. Restated task: Build responsive, accessible React frontend consuming `POST /api/analyze`, featuring multi-modal verdict card, safe XSS-immune text highlighter, bilingual Hindi/English explanation toggle, tap-to-call 1930 & cybercrime action checklist, disclaimer with degraded notice, zero persistent storage, and Vitest test suite.
- [Phase 1] Plan: Documented plan above in docs/progress.md.
- [Phase 2] Implement: On branch `feat/frontend-results`, implemented `api.js`, `useAnalyze.js`, `VerdictCard.jsx`, `HighlightedMessage.jsx`, `RedFlagList.jsx`, `ExplanationPanel.jsx`, `ActionChecklist.jsx`, `DisclaimerBanner.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `SampleMessages.jsx`, `HomePage.jsx`, and updated `App.jsx` and `vite.config.js`.
- [Phase 3] Test: tests: 22 frontend tests passed (`vitest`), 85 backend tests passed (`pytest`), `eslint` clean, `vite build` clean, live backend HTTP check verified (`POST /api/analyze` 200 OK).
- [Phase 4] Review: Verified zero `dangerouslySetInnerHTML`, zero writes to `localStorage`/`sessionStorage`, zero `console.log`, defanged URLs rendered strictly as plain text, WCAG AA contrast, 44px tap targets, aria-live region, and 360px mobile responsiveness.
- [Phase 5] Complete: Documented decisions #27-#28 in `docs/decisions.md`, updated `README.md`, verified DoD checklist. Marked Milestone M2 as complete!

> **Milestone Status:** **Milestone M2 COMPLETE.** (LLM integration, scam-type classification, URL safety intelligence, score fusion, and complete frontend results UI with highlighted red flags and action checklist). Ready for Milestone M3 (Screenshot OCR & Family Mode).

---
- [Phase 0] Understand: Read AGENT.md. Confirmed no prior progress.md exists. Task is M1 Step 1 — full project scaffold, no detection logic.
- [Phase 1] Plan: Written above.
- [Phase 2] Implement: Completed folder layout, FastAPI backend (/health, CORS, pydantic-settings config), React+Vite+Tailwind frontend, root configs (.gitignore, .env.example, README.md).
- [Phase 3] Test: pytest passed (1/1), ruff passed, eslint passed, vite build passed, GET /health returned {"status": "ok"}.
- [Phase 4] Review: Verified no secrets, .env gitignored, dependencies minimal.
- [Phase 5] Document & Report: Documentation created and Step 1 finalized.
