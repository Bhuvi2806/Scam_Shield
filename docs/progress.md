# Scam Shield — Progress Log

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
- [Phase 1] Plan: Written above.
- [Phase 2] Implement: In progress...

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
