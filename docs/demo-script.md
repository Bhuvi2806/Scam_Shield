# Scam Shield — Video Demo Script & Storyboard (2–3 Minutes)

This document provides a scene-by-scene script, storyboard directions, talking points, and 6 ready-to-paste synthetic demo messages for recording or presenting Scam Shield.

---

## 🎬 Video Overview

- **Target Duration**: 2 minutes 30 seconds
- **Format**: Screen recording with voiceover / picture-in-picture presenter
- **Key Message**: Scam Shield helps Indian families instantly verify suspicious messages, understand the specific red flags in Hindi or English, and take immediate action before losing money.

---

## ⏱️ Scene-by-Scene Storyboard

### Scene 1: The Problem & Digital Arrest Scam (0:00 – 0:35)
- **Visual**: Open Scam Shield homepage (`http://localhost:5173`). Highlight the clean, calm, accessible design.
- **Action**: Click the first synthetic quick-sample button: **"Digital Arrest"** (or paste Sample 1). Click **"Check Message"**.
- **Voiceover**: 
  > *"Every day, thousands of citizens across India receive terrifying messages claiming they are under 'digital arrest' or facing an immediate non-bailable warrant from police or CBI. Scam Shield was built to cut through this panic."*
- **Visual Result**: The dashboard displays a vibrant red **"Likely Scam"** card, 92% confidence score, and scam category **"Digital Arrest"**.
- **Action**: Scroll down to the **Highlighted Red Flags** box. Point out the highlighted spans for *"non-bailable warrant"*, *"digital arrest"*, and *"Skype video call"*.
- **Voiceover**: 
  > *"Within milliseconds, Scam Shield highlights the exact manipulation tactics used by the fraudster: artificial authority intimidation, demands to isolate the victim on video call, and extreme urgency."*
- **Action**: Point to the **Action Checklist** with the highlighted **"Call 1930"** button and `cybercrime.gov.in` link.
  > *"Crucially, it tells the user what to do right now: hang up, call the national 1930 cybercrime helpline, and report the incident."*

---

### Scene 2: Hinglish Language Understanding & Electricity Threat (0:35 – 1:05)
- **Action**: Click **"Clear"** (or click the sample chip for Electricity Scam). Paste Sample 2 (Hinglish electricity disconnection threat). Click **"Check Message"**.
- **Visual Result**: Returns **"Likely Scam"** with category **"Electricity Bill Threat"**.
- **Action**: Toggle the explanation language switch between **English** and **हिंदी (Hindi)**.
- **Voiceover**: 
  > *"Scammers in India don't just speak English—they use conversational Hinglish to impersonate local utility providers, threatening disconnection tonight unless an APK or link is opened. Scam Shield understands Hinglish and provides explanations in clear Devanagari Hindi so non-English speakers and senior citizens can easily grasp why the message is fake."*

---

### Scene 3: Screenshot OCR with Hindi & English Support (1:05 – 1:35)
- **Action**: Scroll up to the input box. Click the **"Upload Screenshot"** tab (or drag-and-drop a sample screenshot image).
- **Visual**: The image drops into the dropzone; a subtle thumbnail appears. Click **"Extract Text"**.
- **Visual Result**: Tesseract OCR extracts the Devanagari and English text into an editable review textarea in memory.
- **Voiceover**: 
  > *"Many victims receive fraudulent notifications as screenshots or forwarded images on WhatsApp. With Scam Shield's in-memory OCR engine, users simply upload the screenshot. The system extracts Devanagari Hindi and English text in memory, allowing the user to review and edit before analyzing."*
- **Action**: Click **"Analyze Message"**. Show the instant scam verdict generated from the screenshot text.

---

### Scene 4: Genuine Message Validation — No False Alarm (1:35 – 1:55)
- **Action**: Click **"Clear"**. Paste Sample 3 (an authentic SBI transaction OTP alert). Click **"Check Message"**.
- **Visual Result**: Returns a calm green **"Safe"** verdict.
- **Action**: Highlight the disclaimer at the bottom: *"No red flag found, but never share OTP, PIN or money with anyone who contacts you."*
- **Voiceover**: 
  > *"A reliable tool cannot cry wolf on legitimate communications. When given an authentic bank OTP alert, Scam Shield returns 'Safe'—without false alarms. Yet, following our core safety principle, it never claims '100% safe' and always reinforces the golden rule: never share your OTP with anyone."*

---

### Scene 5: WhatsApp Family Mode Warning Card (1:55 – 2:20)
- **Action**: Go back to the scam result screen. Click the primary button: **"Share with family"** (with WhatsApp icon).
- **Visual Result**: A modern modal opens rendering a high-contrast 1080x1350 card designed specifically for 4:5 mobile viewing on WhatsApp.
- **Action**: Toggle card language to **हिंदी** to show the Hindi translation. Point out that the victim's personal message text, phone numbers, and names are **strictly omitted** from the card.
- **Action**: Click **"Download Card (PNG)"** (or click "Share" to trigger Web Share API).
- **Voiceover**: 
  > *"When someone avoids a scam, the next step is protecting their loved ones. Clicking 'Share with family' generates a clean, privacy-safe 1080x1350 image directly in your browser. It summarizes the red flags and safety steps without ever sharing the victim's personal message or sensitive numbers on family WhatsApp groups."*

---

### Scene 6: Privacy Guarantees & Conclusion (2:20 – 2:40)
- **Action**: Close modal. Click the **"Privacy details"** link near the footer.
- **Visual**: The bilingual Privacy & Guarantees modal opens.
- **Voiceover**: 
  > *"Best of all, Scam Shield is privacy-first: zero message storage, zero cookies, and zero tracking. All analysis runs ephemerally in RAM and is discarded immediately. Scam Shield: Detect scam messages. Protect your family."*
- **Visual**: End title screen with GitHub link and URL.

---

## 📋 6 Ready-to-Paste Synthetic Demo Messages

All messages below are **strictly synthetic**, using fictional identifiers (`98765-XXXXX`), example-style domains (`example-kyc.com`), and public awareness scenarios.

### 1. Digital Arrest Scam (English)
* **Expected Verdict**: `Likely Scam` (Score: ~85–95, Category: `digital_arrest`)
* **Message**:
```text
FINAL LEGAL NOTICE: Non-bailable arrest warrant has been issued against your Aadhaar card by CBI Crime Branch Delhi. Your name is linked to money laundering. You are placed under digital arrest immediately. You must join mandatory Skype interrogation room within 15 minutes or police will raid your premises.
```

### 2. Fake Electricity Disconnection Threat (Hinglish)
* **Expected Verdict**: `Likely Scam` (Score: ~80–90, Category: `electricity_bill`)
* **Message**:
```text
Dear Consumer, apka Bijli bill pichle mahine ka update nahi hua hai. Aaj raat 9:30 PM par apka electric power supply disconnect kar diya jayega. Turant disconnection rokne ke liye hamare electricity officer Sharma ji se 98765-XXXXX par call karein aur update karein.
```

### 3. Fake Bank KYC Account Block (English)
* **Expected Verdict**: `Likely Scam` (Score: ~85–95, Category: `fake_kyc`)
* **Message**:
```text
URGENT: Dear State Bank customer, your account #4920 has been blocked due to incomplete PAN KYC verification. To restore access and prevent permanent card deactivation, click https://sbi-kyc-update.example.com/login immediately.
```

### 4. Part-Time Work From Home Scam (English)
* **Expected Verdict**: `Likely Scam` (Score: ~75–85, Category: `job_scam`)
* **Message**:
```text
Congratulations! You have been selected for Global E-commerce Part-time Review Job. Earn Rs. 3,500 to Rs. 8,000 daily by simply liking YouTube videos and rating hotels on Google Maps. No experience required. Daily payout on UPI. Contact HR Manager on Telegram: @WorkFromHomeEarn
```

### 5. Genuine Bank Transaction OTP Alert (English)
* **Expected Verdict**: `Safe` (Score: 0, Category: None)
* **Message**:
```text
Your SBI debit card ending in 4102 was used for INR 1,250.00 at DMART on 09-NOV-2026. OTP for authentication is 849201. Valid for 5 minutes. Do not share this OTP with anyone, including bank employees.
```

### 6. Tricky Genuine Delivery Alert (English)
* **Expected Verdict**: `Safe` / `Suspicious` (Evaluation boundary case)
* **Message**:
```text
Your Amazon order #402-81920-192 is out for delivery today with delivery associate Rajesh. Share delivery PIN 4920 only at the time of receiving package. Track live: https://www.amazon.in/orders
```
