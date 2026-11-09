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
| 19 | URL rules decoupled into `backend/data/url_rules.json` | Guarantees data-driven extensibility without modifying code; shared by both rule detector and URL checker. |
| 20 | In-memory TTL cache keyed by SHA-256 of normalized URL | Prevents duplicate Safe Browsing API calls for repeated URLs; strictly non-persistent for privacy. |
| 21 | URL defanging (`hxxps://`, `[.]`) for all user-facing findings | Ensures high-risk or suspicious links cannot be clicked accidentally from API responses or UI. |
| 22 | Isolated URL-only Safe Browsing payload | Only extracted URLs are transmitted to Google Safe Browsing v4; zero user message text, numbers, or identifiers are sent. |
| 23 | Concurrent execution via `asyncio.gather` in `/api/analyze` | Runs LLM analysis and Safe Browsing URL lookups simultaneously to reduce end-to-end API response latency. |
| 24 | Asymmetric URL threat weighting in score fusion | A clean URL or absent URL is neutral (not proof of innocence, as many scams contain no links). Therefore `url_score == 0` does not dilute affirmative rule or LLM scam detections. |
| 25 | Pure function architecture for fusion engine | `fuse()` in `backend/app/core/fusion.py` performs zero I/O and depends strictly on schema inputs and constants, ensuring fully deterministic and testable verdict synthesis. |
| 26 | Hierarchical scam-type resolution and actions | Prefers specific LLM classification when aligned with findings, falling back to rule detection; directly dictates type-specific user action checklists while always including 1930 & cybercrime.gov.in. |
| 27 | Pure React text node highlighter (no `dangerouslySetInnerHTML`) | Original user text and red-flagged spans are sliced into pure React text nodes and `<mark>` elements, completely immunizing the UI against XSS attacks from malicious message content. |
| 28 | Zero persistent client storage for user messages and results | Message text, analysis results, and checklist states exist strictly in React memory and are discarded on reload or reset, strictly honoring AGENT.md Section 5 privacy rules. |
| 29 | Separate dedicated `POST /api/ocr` endpoint | Preserves the existing `POST /api/analyze` contract unchanged and guarantees a review-first user flow where users can inspect and correct OCR-extracted text before running analysis. |
| 30 | In-memory only image processing and sanitization | Uploaded screenshots are validated via Pillow magic bytes, bounded by 25MP decompression-bomb limits and 5MB size caps, stripped of all EXIF metadata, and processed strictly in RAM with zero disk writes, temp files, or message logging. |
| 31 | Abstract `OCREngine` with graceful dependency isolation | `OCREngine` interface allows unit and security tests to run deterministically with in-memory test doubles, while `TesseractEngine` auto-detects host binary availability and returns friendly HTTP 503 if missing. |
| 32 | Client-side pre-validation and preview URL lifecycle management | Checks format and size client-side prior to network transfer; safely generates thumbnail previews via `URL.createObjectURL` and explicitly revokes them with `URL.revokeObjectURL` on remove and unmount to prevent memory leaks. |
