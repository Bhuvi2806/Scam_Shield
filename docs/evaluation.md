# Scam Shield — Evaluation & Accuracy Report

> **Document Purpose:** Comprehensive benchmark evaluation of Scam Shield's multi-layer detection pipeline (Rule Detector, Google Safe Browsing, and Fused Decision Engine) across both the training/tuning dataset and an unseen held-out validation set.

---

## 1. Methodology & Evaluation Setup

To assess real-world fraud detection capabilities while adhering strictly to ethical and privacy boundaries:

1. **Synthetic & Public-Awareness Datasets:** Zero real user messages, real bank details, or PII were used. All messages are based on public cybercrime advisories (RBI, TRAI, Indian Cybercrime Coordination Centre - I4C) and standard transactional SMS templates.
2. **Dual-Dataset Validation:**
   - **Tuning Set (`backend/data/test_set.json`):** 74 labelled messages (37 scam, 37 genuine) used during development to calibrate regex patterns, weights, and fusion thresholds.
   - **Held-Out Set (`backend/data/heldout_set.json`):** 40 new, completely unseen messages (20 scam, 20 genuine) created strictly for final evaluation. **No rules, regexes, or weights were tuned against this set.**
3. **Multi-Lingual Coverage:** Both datasets include English, Hindi (Devanagari), and Hinglish (Romanized Hindi) across all 7 targeted Indian fraud categories:
   - Digital Arrest Fraud
   - Fake KYC Deactivation Threat
   - UPI / Refund Reversal Scam
   - Work-from-Home / Part-Time Job Scam
   - Lottery / Prize Impersonation
   - Electricity Bill Disconnection Threat
   - Other / Novel Scams (e.g., Fake e-Challan APKs, instant loan fees)
4. **Hermetic & Opt-In Testing:** Default benchmark evaluation runs completely offline using simulated test doubles (`OfflineSimulatedLLMClient` and `OfflineSafeBrowsingClient`) ensuring zero API credit consumption and deterministic repeatability.

---

## 2. Benchmark Results

### Overall Performance Comparison

| Metric | Tuning Set (`test_set.json`) | Held-Out Set (`heldout_set.json`) |
|:-------|:----------------------------:|:---------------------------------:|
| **Total Samples** | 74 (37 scam / 37 genuine) | 40 (20 scam / 20 genuine) |
| **Accuracy** | **100.00%** (74/74) | **92.50%** (37/40) |
| **Precision** | **100.00%** | **86.96%** |
| **Recall (Scam Catch Rate)** | **100.00%** (37/37) | **100.00%** (20/20) |
| **F1 Score** | **100.00%** | **93.02%** |
| **False Negatives (Missed Scams)** | **0** | **0** (Zero missed scams) |
| **False Positives (False Alarms)** | **0** | **3** (`HELD-028`, `HELD-034`, `HELD-038`) |

---

## 3. Held-Out Breakdown by Scam Type

On the held-out set, all 20 scam messages across all 7 categories were successfully detected and flagged:

| Scam Category | Held-Out Total | Caught as Scam | Scam Type Classification | Category Recall | Type Accuracy |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Digital Arrest Fraud** | 3 | 3 | 3 | 100.0% | 100.0% |
| **Fake KYC Deactivation Threat** | 3 | 3 | 3 | 100.0% | 100.0% |
| **UPI / Refund Reversal Scam** | 3 | 3 | 3 | 100.0% | 100.0% |
| **Part-Time Job / Task Scam** | 3 | 3 | 3 | 100.0% | 100.0% |
| **Lottery / Prize Impersonation** | 3 | 3 | 3 | 100.0% | 100.0% |
| **Electricity Bill Threat** | 3 | 3 | 2 | 100.0% | 66.7% |
| **Other / Emerging Pretexts** | 2 | 2 | 2 | 100.0% | 100.0% |
| **Total / Overall** | **20** | **20** | **19** | **100.0%** | **95.0%** |

---

## 4. Error Analysis & Weak Spot Examination

In strict accordance with an honest engineering evaluation, we examine the three false positive errors on the held-out dataset:

### The 3 False Positives

1. **`HELD-028` (Amazon Delivery OTP)**:
   - *Message Content Summary:* Legitimate delivery notice informing customer that an Amazon delivery associate has arrived and providing a delivery PIN to share upon package handover.
   - *Why Flagged:* Triggered the rule detector's high-severity "OTP / PIN sharing" pattern. The message contained the phrase *"Share delivery PIN 4910 with the delivery associate"*. Because banking safety rules strongly penalize any instruction to "share PIN", the rule layer flagged it as `suspicious`.
2. **`HELD-034` (Income Tax Refund Notification)**:
   - *Message Content Summary:* Authentic notification from the Income Tax Department confirming that an approved tax refund of ₹4,280 was credited to the verified bank account.
   - *Why Flagged:* Collided with the "Refund / Cashback Claim" pattern (`refund approved`). Although pointing to `incometax.gov.in`, the local rule detector assigned baseline suspicion to the word `refund`.
3. **`HELD-038` (Airline Web Check-in)**:
   - *Message Content Summary:* Legitimate IndiGo flight check-in alert providing PNR and inviting the user to check in online.
   - *Why Flagged:* Triggered a minor heuristic regarding bare domain structure (`goindigo.in`) combined with an urgency indicator (*"Web check-in is now open"*).

### Design Trade-Off: Asymmetric Safety

In consumer anti-fraud systems, the cost of a **False Negative** (a victim losing life savings to a digital arrest or fake KYC scam) is catastrophic, whereas the cost of a **False Positive** (a user seeing a caution label on a delivery or tax alert and double-checking) is minor.

Scam Shield explicitly enforces the core safety principle:
> *"When unsure, lean toward `Suspicious`, not `Safe`. A false negative is far worse than a false positive."*

The held-out results validate this design choice: **Zero false negatives (100% recall)** were achieved across both sets.

---

## 5. Limitations of this Evaluation

1. **Synthetic Nature**: All 114 benchmark messages were synthetically authored based on reported threat archetypes. Real-world fraud messages frequently exhibit idiosyncratic typos, regional colloquialisms, or multi-turn conversational pretexts.
2. **Sample Size**: While 114 messages cover the core threat space, it does not represent a massive statistical sample.
3. **Offline Simulation**: The automated benchmark uses deterministic simulated responses for the Claude LLM layer to prevent continuous API expenditure. In production, the Claude API provides even deeper contextual reasoning that helps resolve ambiguity in borderline transactional alerts.

---

## 6. Recommendations for Production Hardening

1. **Domain Whitelisting for Known Government / Courier Services**: Whitelist top Indian courier domains (`*.amazon.in`, `*.indiapost.gov.in`, `*.incometax.gov.in`) in `url_rules.json` to reduce false positives on delivery PIN alerts.
2. **Contextual PIN Exceptions**: Differentiate between "ATM/Banking PIN" demands vs "Delivery PIN on delivery" phrases.
3. **Continuous Evaluation Pipeline**: Incorporate held-out test suites into CI to guard against future detection regressions.
