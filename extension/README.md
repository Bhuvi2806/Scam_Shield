# Scam Shield for WhatsApp Web 🛡️ (Chrome & Edge Extension)

A privacy-first Manifest V3 browser extension that brings real-time scam detection, red flag analysis, and 1930 cybercrime guidance directly inside **WhatsApp Web** (`https://web.whatsapp.com`).

---

## 🚀 Features

- **1-Click Message Analysis**: Adds a discreet `[🛡️ Check]` button beside incoming WhatsApp chat bubbles.
- **In-Context Verdict Modal**: Displays a clean, floating overlay with verdict (`Likely Scam`, `Suspicious`, `Safe`), risk score, categorized red flags, and bilingual English & Hindi explanations without navigating away from chat.
- **Immediate Action Guidance**: Direct links to call `1930` (National Cyber Crime Helpline) and report fraud at `cybercrime.gov.in`.
- **Quick-Check Popup**: Paste and verify suspicious messages directly from the extension toolbar icon.
- **Strict Privacy**: Zero background scraping, zero tracking, and zero database writes. The extension only processes the specific message you explicitly choose to verify.

---

## 📦 How to Install (Developer Mode)

Works with any Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi).

### Step 1: Start the Scam Shield Backend
Ensure the Scam Shield backend server is running locally:
```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000
```
*(Or use your deployed production backend URL).*

### Step 2: Load Extension in Browser
1. Open Google Chrome (or Edge / Brave) and navigate to:
   ```text
   chrome://extensions/
   ```
   *(In Microsoft Edge, navigate to `edge://extensions/`).*
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `extension/` folder located in this repository:
   ```text
   <path-to-repository>/extension
   ```
5. The extension **Scam Shield for WhatsApp Web 🛡️** will now appear in your browser toolbar!

### Step 3: Open WhatsApp Web
1. Navigate to [https://web.whatsapp.com](https://web.whatsapp.com).
2. Open any conversation. You will see a small `[🛡️ Check]` button appear beside message bubbles.
3. Click `[🛡️ Check]` on any suspicious message to view instant scam analysis in context!

---

## ⚙️ Configuration

Click the Scam Shield shield icon in your browser toolbar:
- **Backend API URL**: Defaults to `http://localhost:8000`. If you host Scam Shield on Render, Railway, or AWS, enter your public HTTPS endpoint (e.g., `https://scamshield-api.onrender.com`) and click **Save Settings**.
- **Quick Check**: Paste any suspicious message to test immediately without opening WhatsApp.

---

## 🔒 Privacy Architecture

1. **Opt-In Only**: The extension does not read, store, or monitor your conversations in the background. It reads message text only when you explicitly click the `[🛡️ Check]` button.
2. **RAM-Only Processing**: The backend analyzes text in memory and discards it immediately upon response.
3. **No External Trackers**: The extension contains zero third-party analytics or tracking scripts.
