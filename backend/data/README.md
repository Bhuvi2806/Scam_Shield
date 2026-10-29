# Scam Shield — Data Directory

This directory contains the rule patterns and evaluation datasets for Scam Shield.

## Files

- **`patterns.json`**: Rule-based detection patterns covering high-risk indicators across known scam types.
- **`test_set.json`**: Labelled synthetic messages (`scam` vs `genuine`) in English, Hindi, and Hinglish for accuracy evaluation.

---

## Pattern Format (`patterns.json`)

Each pattern object adheres to the `Pattern` Pydantic model (`app.schemas.dataset.Pattern`):

```json
{
  "id": "PAT-001",
  "scam_type": "digital arrest",
  "name": "Law enforcement agency impersonation",
  "description": "Scammer poses as CBI, Narcotics Control Bureau, Mumbai Police or Cyber Crime cell.",
  "keywords_en": ["cbi officer", "cyber crime department", "mumbai police"],
  "keywords_hi": ["सीबीआई", "साइबर क्राइम", "पुलिस अधिकारी", "cbi adhikari"],
  "regexes": ["(?i)\\b(cbi|ncb|enforcement\\s*directorate|cyber\\s*crime\\s*branch)\\b"],
  "red_flag_category": "authority impersonation",
  "weight": 5
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `id` | `str` | Unique pattern ID (e.g., `PAT-001`, `PAT-036`). Must be unique across all patterns. |
| `scam_type` | `str` | One of the 7 supported scam types: `digital arrest`, `fake KYC`, `UPI refund`, `job/task scam`, `lottery/prize`, `electricity-bill threat`, `other`. |
| `name` | `str` | Short human-readable name of the pattern. |
| `description` | `str` | Detailed description of what behavior or scam indicator this pattern targets. |
| `keywords_en` | `List[str]` | Lowercase English keywords or key phrases. |
| `keywords_hi` | `List[str]` | Hindi keywords in both Devanagari script and Hinglish transliteration. |
| `regexes` | `List[str]` | Regular expressions for pattern matching (case-insensitive flag `(?i)` recommended). |
| `red_flag_category` | `str` | Indicator category: `urgency`, `authority impersonation`, `OTP/PIN/CVV demand`, `money transfer demand`, `stay on video call`, `suspicious link/APK`, `threats of arrest/disconnection`, `too-good-to-be-true reward`. |
| `weight` | `int` (1-5) | Severity score from 1 (minor indicator) to 5 (critical red flag). |

---

## Evaluation Test Set Format (`test_set.json`)

Each message object adheres to the `TestMessage` Pydantic model (`app.schemas.dataset.TestMessage`):

```json
{
  "id": "MSG-001",
  "text": "URGENT: Non-bailable arrest warrant has been issued against you by Cyber Crime Branch...",
  "language": "en",
  "label": "scam",
  "scam_type": "digital arrest",
  "notes": "Classic digital arrest scam: fake CBI/police impersonation."
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `id` | `str` | Unique message ID (e.g., `MSG-001`). |
| `text` | `str` | Full synthetic message text. |
| `language` | `str` | One of: `"en"` (English), `"hi"` (Hindi in Devanagari), `"hinglish"` (Hindi in Latin script). |
| `label` | `str` | Ground truth: `"scam"` or `"genuine"`. |
| `scam_type` | `Optional[str]` | For `"scam"` messages, one of the 7 scam types. For `"genuine"` messages, must be `null` (`None`). |
| `notes` | `str` | Rationale for classification and why tricky genuine messages should not be flagged. |

---

## How to Add a New Pattern

1. **Assign a Unique ID**: Take the next sequential pattern ID (e.g. `PAT-036`).
2. **Select Scam Type & Category**: Use one of the 7 valid scam types and an appropriate red-flag category.
3. **Add Dual-Script Keywords**:
   - Provide English keywords in `keywords_en`.
   - Provide Hindi keywords in `keywords_hi` with both Devanagari script (e.g. `ओटीपी`) and Hinglish (e.g. `otp share karo`).
4. **Draft Regexes**: Ensure regexes are valid Python expressions and escape backslashes in JSON (e.g., `\\b`).
5. **Assign Weight**:
   - `5`: Direct threat of arrest, immediate money transfer demand, or credential theft.
   - `4`: High-urgency deadline, suspicious APK/link, or authority impersonation.
   - `1-3`: Contextual or secondary red flags.
6. **Validate**:
   Run the test suite to ensure schema conformance and uniqueness:
   ```bash
   pytest tests/test_dataset.py -v
   ```

---

## Privacy & Synthetic Data Rules (Mandatory)

Per project rulebook (`AGENT.md` Section 3 and Section 5):
- **Never include real personal data**: Phone numbers, bank account numbers, UPI IDs, citizen names, or residential addresses are strictly forbidden.
- Always use standard synthetic placeholders:
  - Phone: `98XXXXXXXX`, `1800-XXX-XXXX`
  - Bank/Account: `XXXXXXXX`, `IFSC: BKID000XXXX`
  - Domains: `example.com`, `gov.in`, `bit.ly/...`
  - Names: Generic placeholders (`Rajesh Kumar`, `Mr. Sharma`) based strictly on public awareness advisories.
