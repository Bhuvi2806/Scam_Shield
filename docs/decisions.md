# Scam Shield — Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Tailwind CSS v4 with `@tailwindcss/vite` plugin | Latest stable; v4 uses CSS-first config and the Vite plugin, no `tailwind.config.js` needed. |
| 2 | `pytest-anyio` for async test support | Lighter than `pytest-asyncio` and works well with httpx's `ASGITransport`. |
| 3 | Pydantic Settings with `model_config` dict | Pydantic v2 style; avoids deprecated `class Config` inner class. |
| 4 | Dark-mode-only UI for initial build | Simpler starting point; light mode can be added later. Matches modern app aesthetic. |
| 5 | `.gitkeep` files for empty `hooks/`, `pages/`, `components/` | Ensures git tracks the directory structure from the start. |
| 6 | ESLint (not Oxlint) via `--eslint` flag | More widely used, better React plugin ecosystem. Vite scaffolder supports it natively. |
