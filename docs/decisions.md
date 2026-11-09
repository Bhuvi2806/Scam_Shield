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
| 11 | Centralized thresholds and disclaimers in `app/core/constants.py` | Eliminates magic numbers across the codebase and guarantees exact safety disclaimer wording. |
| 12 | Contextual protective negation filter in `RuleDetector` | Checks 80-char surrounding window for anti-fraud warnings (e.g., "never share OTP with bank staff", government advisories) to eliminate false positives on authentic alerts. |
| 13 | Local heuristic URL checks for APKs, raw IPs, and deceptive domains | Flags high-risk URL patterns without calling external APIs (preserving privacy and latency). |
| 14 | Base-weight scoring model with non-linear flag aggregation | Weight 5 flags immediately trigger score >= 60 (`likely_scam`), while minor flags yield `suspicious` unless corroborated. |
| 15 | Abstract `LLMClient` interface | Enables clean unit tests with `FakeLLMClient` without real API calls, network dependencies, or API key requirements. |
| 16 | XML `<message>` delimiters with prompt-injection defense | Isolates untrusted user content as pure data, telling the model to ignore any commands inside the message payload. |
| 17 | 1-retry policy on LLM JSON/validation failure | Handles occasional markdown fence or minor formatting glitches from the LLM before raising a controlled error. |
| 18 | Dual-result response shape with graceful LLM fallback | `POST /api/analyze` returns both rule and LLM results; if LLM fails or is disabled, rule detection still completes seamlessly. |
