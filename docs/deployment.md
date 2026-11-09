# Scam Shield — Deployment & Production Hosting Guide

This guide details recommended deployment architectures, environment variable configurations, free-tier hosting setups, API spending limits, and container execution workflows for **Scam Shield**.

---

## 1. Architecture Overview

Scam Shield consists of two decoupled tiers designed for high privacy, low cost, and zero data persistence:
- **Frontend**: Single Page Application (React 19 + Tailwind CSS) compiled to static assets (`dist/`), hosted on static edge networks (Vercel, Netlify, Cloudflare Pages, or Nginx container).
- **Backend**: FastAPI (Python 3.12) with Tesseract OCR (`hin+eng`), Claude API integration, and Google Safe Browsing v4 client. Runs as a stateless container or web service on Render, Railway, Fly.io, or AWS ECS.

```
+---------------------------------------------------------+
|                  Client Browser                         |
|  - In-memory text / image input                         |
|  - Family Mode Card generation (html-to-image)          |
|  - Zero persistent cookies / local storage              |
+---------------------------+-----------------------------+
                            | HTTPS
                            v
+---------------------------------------------------------+
|                Static Frontend Host                     |
|           (Vercel / Netlify / Nginx)                    |
+---------------------------+-----------------------------+
                            | HTTPS POST
                            v
+---------------------------------------------------------+
|                FastAPI Backend Service                  |
|               (Render / Railway / Docker)               |
|                                                         |
|  +----------------+  +-----------------+  +----------+  |
|  | Rule Detector  |  |  URL Intelligence|  | OCR Eng. |  |
|  +----------------+  +-----------------+  +----------+  |
|           \                   |                /        |
|            +------------------+---------------+         |
|                               v                         |
|                    Claude LLM (Structured)              |
|                               v                         |
|                      Consolidated Fusion                |
+---------------------------------------------------------+
```

---

## 2. Environment Variables Reference

### Backend Configuration (`.env`)

| Variable | Type | Default | Required? | Purpose |
|---|---|---|---|---|
| `FRONTEND_ORIGIN` | string | `http://localhost:5173` | **Yes** | Whitelisted origin for CORS headers. Set to your production frontend domain (e.g. `https://scamshield.vercel.app`). Wildcards (`*`) are disallowed for security. |
| `ANTHROPIC_API_KEY` | string | `""` | Optional | API key for Anthropic Claude. If omitted, Scam Shield starts in degraded mode: LLM layer is bypassed and rule-based + URL heuristics run with zero crashes. |
| `SAFE_BROWSING_API_KEY` | string | `""` | Optional | Google Safe Browsing v4 lookup key. If omitted, local URL heuristic analysis (IP addresses, deceptive subdomains, APK extensions) continues operating. |
| `ANTHROPIC_MODEL` | string | `claude-sonnet-4-20250514` | Optional | Claude model name for structured analysis. |
| `LLM_ENABLED` | bool | `true` | Optional | Toggles LLM layer on/off globally. |
| `LLM_TIMEOUT` | int | `30` | Optional | Timeout in seconds for Claude API invocations. |
| `URL_CHECK_ENABLED` | bool | `true` | Optional | Toggles URL detection layer globally. |
| `SAFE_BROWSING_TIMEOUT` | int | `5` | Optional | Timeout in seconds for Google Safe Browsing queries. |

### Frontend Configuration (`.env` or build environment)

| Variable | Type | Default | Required? | Purpose |
|---|---|---|---|---|
| `VITE_API_URL` | string | `http://localhost:8000` | **Yes** in production | Base URL of the deployed FastAPI backend. Must point to your live backend domain (e.g. `https://scamshield-api.onrender.com`). |

---

## 3. Recommended Free-Tier Hosting Setup

### A. Frontend on Vercel (or Netlify)

1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) (or [Netlify](https://netlify.com)) and click **Add New Project**.
3. Select your repository.
4. Set the **Root Directory** to `frontend`.
5. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
6. Add Environment Variable:
   - `VITE_API_URL`: Your backend URL (e.g., `https://scamshield-backend.onrender.com`).
7. Click **Deploy**.

### B. Backend on Render (Docker-based)

Render provides free containerized web services that support custom Dockerfiles containing Tesseract OCR and system libraries.

1. Sign in to [Render](https://render.com) and click **New + -> Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Environment**: `Docker`
   - **Docker Context**: `backend` (or project root, pointing to `backend/Dockerfile`)
   - **Region**: Singapore or Frankfurt (choose nearest to target users)
   - **Branch**: `main`
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   - `FRONTEND_ORIGIN`: Your deployed Vercel domain (`https://<your-project>.vercel.app`).
   - `ANTHROPIC_API_KEY`: Your Claude API key.
   - `SAFE_BROWSING_API_KEY`: Your Google Safe Browsing key.
5. Click **Create Web Service**.

> [!NOTE]
> **Cold Starts**: Render's free tier spins down idle instances after 15 minutes of inactivity. When a new user submits a message, the first request may experience a 30-50 second delay while the container boots up. The Scam Shield frontend includes friendly loading indicators and an automatic 45-second AbortController timeout to gracefully handle cold starts.

---

## 4. Spending Caps & Budget Safeguards

To prevent unexpected charges from external APIs, configure strict budget caps before public deployment:

1. **Anthropic Console (Claude API)**:
   - Visit [console.anthropic.com](https://console.anthropic.com) -> **Settings** -> **Plans & Billing**.
   - Set a **Monthly Spend Limit** (e.g., $5.00 or $10.00 USD).
   - Configure **Usage Alerts** to receive emails at 50%, 75%, and 90% of threshold.
   - Once the cap is hit, requests return HTTP 429; Scam Shield's backend gracefully degrades to rule-based analysis without interrupting service.

2. **Google Cloud Console (Safe Browsing v4)**:
   - Visit [console.cloud.google.com](https://console.cloud.google.com) -> **Billing** -> **Budgets & Alerts**.
   - Safe Browsing v4 includes a generous free tier (up to 10,000 lookups/day).
   - Create a budget with a $0 threshold and alert notifications to guarantee zero surprise billing.

---

## 5. Local Full-Stack Container Execution (Docker Compose)

Scam Shield provides a production-ready `docker-compose.yml` for testing the entire multi-tier stack locally in an isolated container environment:

```bash
# 1. Create a local .env file in root with keys (optional)
echo "ANTHROPIC_API_KEY=your_key_here" > .env
echo "SAFE_BROWSING_API_KEY=your_key_here" >> .env

# 2. Build and run backend (port 8000) and frontend (port 80)
docker compose up --build -d

# 3. Check service health
curl http://localhost:8000/health
# {"status":"ok"}

# 4. Open browser
# Navigate to http://localhost

# 5. Stop containers
docker compose down
```

---

## 6. Security & Privacy Guarantees in Production

Deployments must preserve the architectural privacy guarantees defined in `AGENT.md`:
1. **Zero Message Logging**: The backend processes message texts in memory and discards them immediately upon request completion. No database or message log exists.
2. **Untrusted Input Protection**: Screenshot uploads are limited to 5MB and 25MP decompression-bomb limits, sanitized in memory, stripped of EXIF metadata, and never persisted to filesystem temp directories.
3. **Defensive Response Headers**: All HTTP responses enforce `nosniff`, `DENY` clickjacking protection, `strict-origin-when-cross-origin`, and `Permissions-Policy`.
4. **CORS Lockdown**: Only requests from the explicitly designated `FRONTEND_ORIGIN` are permitted.
