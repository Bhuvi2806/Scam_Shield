# Scam Shield — Comprehensive Evaluation Report

> **Generated at:** 2026-11-09 17:24:13 UTC  
> **Privacy Notice:** Strictly anonymized. Contains zero message text or personal data; message IDs only.

## 1. Executive Summary

| Evaluation Benchmark | Samples | Mode | Accuracy | Precision | Recall | F1 Score | FP | FN |
|:----------------------|:--------|:-----|:---------|:----------|:-------|:---------|:---|:---|
| **Tuning Set** (Known) | 74 | Rule Detector | 100.00% | 100.00% | 100.00% | 100.00% | 0 | 0 |
| **Tuning Set** (Known) | 74 | Score Fusion | 100.00% | 100.00% | 100.00% | 100.00% | 0 | 0 |
| **Held-Out Set** (Unseen) | 40 | Rule Detector | 87.50% | 85.71% | 90.00% | 87.80% | 3 | 2 |
| **Held-Out Set** (Unseen) | 40 | Score Fusion | 92.50% | 86.96% | 100.00% | 93.02% | 3 | 0 |

---

## 2. Held-Out Benchmark Analysis (Unseen Test Data)

- **Total Held-Out Samples:** 40 (20 Scam, 20 Genuine)
- **Fusion Accuracy:** **92.50%**
- **Fusion Recall:** **100.00%** (Catching real scams)
- **Fusion Precision:** **86.96%** (Confidence when flagging)
- **False Negatives:** 0 (Missed scams: `None`)
- **False Positives:** 3 (Legitimate messages flagged: `['HELD-028', 'HELD-034', 'HELD-038']`)

### Per-Scam-Type Performance on Held-Out Set

| Scam Type | Total | Detected | Type Classified | Recall | Classification Acc |
|:----------|:------|:---------|:----------------|:-------|:-------------------|
| `digital_arrest` | 3 | 3 | 3 | 100.0% | 100.0% |
| `electricity_bill_threat` | 3 | 3 | 2 | 100.0% | 66.7% |
| `fake_kyc` | 3 | 3 | 3 | 100.0% | 100.0% |
| `job_task_scam` | 3 | 3 | 3 | 100.0% | 100.0% |
| `lottery_prize` | 3 | 3 | 3 | 100.0% | 100.0% |
| `other` | 2 | 2 | 2 | 100.0% | 100.0% |
| `upi_refund` | 3 | 3 | 3 | 100.0% | 100.0% |

---

## 3. Tuning Set Performance (Baseline Reference)

- **Total Tuning Samples:** 74 (37 Scam, 37 Genuine)
- **Fusion Accuracy:** **100.00%**
- **False Negatives:** 0
- **False Positives:** 0

---

## 4. Observations & Weak Spot Analysis

1. **Generalization across Novel Pretexts:** The rule and score fusion pipelines successfully detect conversational pretexts (e.g. customs seizure, smart meter cutoff, fake challan APKs) on unseen messages.
2. **Negation Filter Efficacy:** Authentic bank alerts with safety warnings ('Never share OTP with bank staff') are correctly classified as Safe without triggering false alarms.
3. **Identified Edge Cases:** Novel pretexts with minimal urgency vocabulary or zero URLs rely more heavily on contextual keywords or the LLM layer. If both rule and URL checks show zero flags, fusion caps the score at `suspicious`.
