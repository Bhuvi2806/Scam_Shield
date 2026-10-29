# Scam Shield — Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Tailwind CSS v4 with `@tailwindcss/vite` plugin | Latest stable; v4 uses CSS-first config and the Vite plugin, no `tailwind.config.js` needed. |
| 2 | `pytest-anyio` for async test support | Lighter than `pytest-asyncio` and works well with httpx's `ASGITransport`. |
| 3 | Pydantic Settings with `model_config` dict | Pydantic v2 style; avoids deprecated `class Config` inner class. |
| 4 | Dark-mode-only UI for initial build | Simpler starting point; light mode can be added later. Matches modern app aesthetic. |
| 5 | `.gitkeep` files for empty `hooks/`, `pages/`, `components/` | Ensures git tracks the directory structure from the start. |
| 6 | ESLint (not Oxlint) via `--eslint` flag | More widely used, better React plugin ecosystem. Vite scaffolder supports it natively. |
| 7 | 35 patterns (above 30 min) across 7 scam types | Ensures balanced coverage across all 7 target scam types and all red-flag categories. |
| 8 | 70 test messages (35 scam, 35 genuine) across 3 languages | Exceeds the 60-message minimum with balanced English, Hindi, and Hinglish representation and tricky genuine edge cases (real OTP disclaimers, utility bills). |
| 9 | Strict cross-field validation on `TestMessage` | Enforces `scam_type is None` for genuine messages and valid `scam_type` for scam messages at schema parsing time. |
| 10 | `TypeError` for non-list JSON root in dataset loaders | Adheres to Ruff's `TRY004` recommendation for type-checking exceptions. |
