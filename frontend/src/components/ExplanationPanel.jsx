import { useState } from "react";
import PropTypes from "prop-types";

/**
 * Detect if text contains Devanagari script (Hindi).
 * @param {string} text
 * @returns {boolean}
 */
function containsDevanagari(text) {
  if (!text || typeof text !== "string") return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * ExplanationPanel renders plain-language explanations with a Hindi / English toggle.
 * The default language is set to Hindi if the analyzed text contains Devanagari,
 * otherwise defaulting to English. The user's selection is kept strictly in React
 * state for the active session (never written to localStorage/sessionStorage).
 */
export function ExplanationPanel({ explanationEn, explanationHi, originalText = "" }) {
  // Determine initial language: 'hi' if original input had Devanagari, else 'en'
  const [lang, setLang] = useState(() => (containsDevanagari(originalText) ? "hi" : "en"));

  const isHindi = lang === "hi";
  const currentExplanation = isHindi ? explanationHi : explanationEn;

  return (
    <div className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.002 6.002 0 00-4-5.659V7a4 4 0 118 0v.091a6.002 6.002 0 00-4 5.659z" />
          </svg>
          Why is this message flagged? &middot; कारण
        </h3>

        {/* Hindi / English Toggle */}
        <div
          role="group"
          aria-label="Select explanation language"
          className="inline-flex rounded-xl bg-surface p-1 border border-white/10"
        >
          <button
            type="button"
            aria-pressed={!isHindi}
            onClick={() => setLang("en")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isHindi
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-text-muted hover:text-text"
            }`}
          >
            English
          </button>
          <button
            type="button"
            aria-pressed={isHindi}
            onClick={() => setLang("hi")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isHindi
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-text-muted hover:text-text"
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      <div className="bg-surface/80 p-4 sm:p-5 rounded-xl border border-white/5">
        <p className="text-sm sm:text-base text-text/90 leading-relaxed font-normal">
          {currentExplanation || (isHindi ? "कोई विवरण उपलब्ध नहीं है।" : "No explanation available.")}
        </p>
      </div>
    </div>
  );
}

ExplanationPanel.propTypes = {
  explanationEn: PropTypes.string.isRequired,
  explanationHi: PropTypes.string.isRequired,
  originalText: PropTypes.string,
};
