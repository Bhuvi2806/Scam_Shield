/**
 * Pure functions to build privacy-safe content for Family Mode share cards
 * and WhatsApp text summaries.
 *
 * PRIVACY GUARANTEES:
 * - Content is built strictly from the FinalVerdict object.
 * - Original message text and red flag 'quote' fields are NEVER included.
 * - Any URLs are strictly defanged (hxxps://, [.]).
 * - "100% safe" is never emitted; safe cards always carry the mandatory caution disclaimer.
 *
 * @module lib/cardContent
 */

import { STRINGS } from "./strings";

export const MAX_CARD_FLAGS = 3;
export const MAX_CARD_STEPS = 4;

/**
 * Defang a URL for safe non-clickable text display.
 * @param {string} url
 * @returns {string}
 */
export function defangUrl(url) {
  if (!url || typeof url !== "string") return "";
  return url
    .replace(/^https:\/\//i, "hxxps://")
    .replace(/^http:\/\//i, "hxxp://")
    .replace(/\./g, "[.]");
}

/**
 * Format date for display on the card.
 * @param {Date} [date]
 * @param {'en'|'hi'} [lang]
 * @returns {string}
 */
export function formatCardDate(date = new Date(), lang = "en") {
  try {
    const locale = lang === "hi" ? "hi-IN" : "en-IN";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Build privacy-safe structured content for FamilyCard display.
 *
 * @param {import('./api').FinalVerdict} verdict Final fused verdict
 * @param {'en'|'hi'} [lang='en'] Language choice
 * @param {Date} [now] Optional date override for deterministic tests
 * @returns {Object} Structured card content
 */
export function buildCardContent(verdict, lang = "en", now = new Date()) {
  if (!verdict) {
    throw new Error("Verdict data is required to generate share card.");
  }

  const currentLang = lang === "hi" ? "hi" : "en";
  const verdictKey = verdict.verdict || "suspicious";
  const verdictMeta = STRINGS.verdicts[verdictKey] || STRINGS.verdicts.suspicious;
  const scamTypeKey = verdict.scam_type || "none";
  const scamTypeMeta = STRINGS.scamTypes[scamTypeKey] || STRINGS.scamTypes.other;

  // 1. Red flags: select up to MAX_CARD_FLAGS, NEVER including original message quotes
  const rawFlags = Array.isArray(verdict.red_flags) ? verdict.red_flags : [];
  let flags = rawFlags.slice(0, MAX_CARD_FLAGS).map((flag) => {
    let cleanReason = typeof flag.reason === "string" ? flag.reason : "Suspicious activity detected";
    // Ensure any embedded URLs are defanged
    cleanReason = cleanReason.replace(/https?:\/\/[^\s]+/g, (match) => defangUrl(match));

    return {
      category: flag.category || "Warning",
      reason: cleanReason,
      // Note: 'quote', 'start', 'end' are intentionally NOT passed to card
    };
  });

  if (flags.length === 0) {
    if (verdictKey === "safe") {
      flags = [
        {
          category: currentLang === "hi" ? "सत्यापन" : "Verification",
          reason:
            currentLang === "hi"
              ? "कोई तात्कालिकता, खाता बंद करने की धमकी या फर्जी लिंक नहीं मिला।"
              : "No urgency cues, account threats, or deceptive links detected.",
        },
      ];
    } else {
      flags = [
        {
          category: currentLang === "hi" ? "सतर्कता" : "Caution",
          reason:
            currentLang === "hi"
              ? "सीमित विश्लेषण उपलब्ध — कृपया अज्ञात स्रोतों से सतर्क रहें।"
              : "Limited analysis available — please remain vigilant with unknown contacts.",
        },
      ];
    }
  }

  // 2. Action steps: ensure 1930 and cybercrime.gov.in are always present, cap at MAX_CARD_STEPS
  const rawActions = Array.isArray(verdict.actions) ? verdict.actions : [];
  const processedSteps = [];

  // Add action items from verdict
  for (const action of rawActions) {
    if (!action) continue;
    const text = currentLang === "hi" ? action.text_hi || action.text_en : action.text_en;
    if (text) {
      processedSteps.push({
        id: action.id,
        text,
        phone: action.phone || null,
        link: action.link ? defangUrl(action.link) : null,
      });
    }
    if (processedSteps.length >= MAX_CARD_STEPS) break;
  }

  // Ensure 1930 is present
  const has1930 = processedSteps.some((s) => s.phone === "1930" || s.text.includes("1930"));
  if (!has1930) {
    const mandatory1930 = STRINGS.mandatorySteps[0];
    const text1930 = currentLang === "hi" ? mandatory1930.text_hi : mandatory1930.text_en;
    if (processedSteps.length >= MAX_CARD_STEPS) {
      processedSteps.pop();
    }
    processedSteps.push({
      id: mandatory1930.id,
      text: text1930,
      phone: "1930",
      link: null,
    });
  }

  // Ensure cybercrime.gov.in is present
  const hasCybercrime = processedSteps.some((s) => s.text.includes("cybercrime.gov.in"));
  if (!hasCybercrime && processedSteps.length < MAX_CARD_STEPS) {
    const mandatoryPortal = STRINGS.mandatorySteps[1];
    const textPortal = currentLang === "hi" ? mandatoryPortal.text_hi : mandatoryPortal.text_en;
    processedSteps.push({
      id: mandatoryPortal.id,
      text: textPortal,
      phone: null,
      link: "cybercrime.gov.in",
    });
  }

  // 3. Disclaimer: use official localized text; safe cards MUST carry exact caution
  let disclaimer = STRINGS.disclaimers[verdictKey]?.[currentLang] || verdict.disclaimer;
  if (verdictKey === "safe") {
    disclaimer = STRINGS.disclaimers.safe[currentLang];
  }

  // Double-check: ensure "100% safe" never appears anywhere
  disclaimer = disclaimer.replace(/100%\s*safe/gi, "Safe");

  return {
    appName: STRINGS.appName[currentLang],
    tagline: STRINGS.tagline[currentLang],
    verdict: verdictKey,
    verdictLabel: verdictMeta[currentLang],
    themeColor: verdictMeta.themeColor,
    accentBg: verdictMeta.accentBg,
    borderColor: verdictMeta.borderColor,
    textColor: verdictMeta.textColor,
    score: typeof verdict.score === "number" ? verdict.score : 0,
    scamTypeLabel: scamTypeMeta[currentLang],
    headings: {
      keyWarningSigns: STRINGS.headings.keyWarningSigns[currentLang],
      whatToDoNow: STRINGS.headings.whatToDoNow[currentLang],
      safetyNotice: STRINGS.headings.disclaimerTitle[currentLang],
      forwardFamily: STRINGS.headings.forwardFamily[currentLang],
    },
    flags,
    steps: processedSteps.slice(0, MAX_CARD_STEPS),
    disclaimer,
    dateText: formatCardDate(now, currentLang),
    degraded: Boolean(verdict.degraded),
  };
}

/**
 * Build a concise, safe text summary for WhatsApp / clipboard sharing.
 * Contains only the verdict, scam type, safety checklist, and 1930 helpline.
 * Zero user text, zero OTPs, zero numbers from the submitted message.
 *
 * @param {import('./api').FinalVerdict} verdict
 * @param {'en'|'hi'} [lang='en']
 * @returns {string} Plain text formatted with WhatsApp bolding (*)
 */
export function buildShareText(verdict, lang = "en") {
  const currentLang = lang === "hi" ? "hi" : "en";
  const content = buildCardContent(verdict, currentLang);

  const lines = [];

  if (currentLang === "hi") {
    lines.push(`🛡️ *स्कैम शील्ड — सुरक्षा चेतावनी*`);
    lines.push(`निर्णय: *${content.verdictLabel}* (${content.scamTypeLabel})`);
    lines.push(``);
    lines.push(`⚠️ *क्या करें:*`);
    content.steps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step.text}`);
    });
    lines.push(``);
    lines.push(`📞 *राष्ट्रीय साइबर हेल्पलाइन:* 1930`);
    lines.push(`🌐 *पोर्टल:* cybercrime.gov.in`);
    lines.push(``);
    lines.push(`📌 *सूचना:* ${content.disclaimer}`);
    lines.push(`_संदिग्ध संदेश जांचने के लिए: Scam Shield_`);
  } else {
    lines.push(`🛡️ *Scam Shield — Fraud Alert*`);
    lines.push(`Verdict: *${content.verdictLabel}* (${content.scamTypeLabel})`);
    lines.push(``);
    lines.push(`⚠️ *What to do:*`);
    content.steps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step.text}`);
    });
    lines.push(``);
    lines.push(`📞 *National Cyber Helpline:* 1930`);
    lines.push(`🌐 *Official Portal:* cybercrime.gov.in`);
    lines.push(``);
    lines.push(`📌 *Notice:* ${content.disclaimer}`);
    lines.push(`_Check suspicious messages at: Scam Shield_`);
  }

  return lines.join("\n");
}
