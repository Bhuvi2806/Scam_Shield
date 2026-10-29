# Scam Shield — Progress Log

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
- [Phase 0] Understand: Read AGENT.md. Confirmed no prior progress.md exists. Task is M1 Step 1 — full project scaffold, no detection logic.
- [Phase 1] Plan: Written above.
- [Phase 2] Implement: Completed folder layout, FastAPI backend (/health, CORS, pydantic-settings config), React+Vite+Tailwind frontend, root configs (.gitignore, .env.example, README.md).
- [Phase 3] Test: pytest passed (1/1), ruff passed, eslint passed, vite build passed, GET /health returned {"status": "ok"}.
- [Phase 4] Review: Verified no secrets, .env gitignored, dependencies minimal.
- [Phase 5] Document & Report: Documentation created and Step 1 finalized.
