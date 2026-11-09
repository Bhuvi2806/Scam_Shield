import { forwardRef } from "react";
import PropTypes from "prop-types";
import { buildCardContent } from "../lib/cardContent";

/**
 * FamilyCard renders a 1080x1350 (4:5) visual safety alert card
 * designed specifically for sharing with family members on WhatsApp.
 *
 * DESIGN & PRIVACY PRINCIPLES:
 * - High readability for all age groups (large text, WCAG AA contrast).
 * - Multi-modal verdict: Color + Icon + Text badge (never color alone).
 * - Strictly derived from FinalVerdict (zero original message text or quotes).
 * - Defanged URLs only, non-clickable.
 * - Always includes 1930 National Cyber Helpline and cybercrime.gov.in.
 * - No government emblems, police seals, or official impersonation logos.
 * - Pure React text nodes (zero dangerouslySetInnerHTML).
 */
export const FamilyCard = forwardRef(function FamilyCard({ verdict, lang = "en" }, ref) {
  const content = buildCardContent(verdict, lang);

  // Theme configuration based on categorical verdict
  let iconPath = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 18.75h.007v.008H12v-.008z"
    />
  );

  if (content.verdict === "safe") {
    iconPath = (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    );
  } else if (content.verdict === "suspicious") {
    iconPath = (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    );
  }

  return (
    <div
      ref={ref}
      data-testid="family-card"
      style={{
        width: "1080px",
        height: "1350px",
        boxSizing: "border-box",
        fontFamily: "'Noto Sans', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      className="bg-[#0b1329] text-[#f8fafc] p-16 flex flex-col justify-between select-none relative overflow-hidden"
    >
      {/* Background Accent Gradients */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: content.themeColor }}
      />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl bg-indigo-600 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-lg">
            <svg
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              {content.appName}
            </h1>
            <p className="text-xl text-slate-400 font-medium mt-1">
              {content.tagline}
            </p>
          </div>
        </div>

        <div className="px-5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 text-lg font-medium shadow-sm">
          {content.dateText}
        </div>
      </header>

      {/* Main Body Content */}
      <main className="relative z-10 flex-1 my-8 flex flex-col justify-between gap-6">
        {/* 1. Main Verdict Banner */}
        <div
          style={{
            borderColor: content.borderColor,
            backgroundColor: content.accentBg,
          }}
          className="rounded-3xl border-2 p-8 shadow-2xl backdrop-blur-md flex items-center justify-between"
        >
          <div className="flex items-center gap-6">
            <div
              style={{ backgroundColor: content.themeColor }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"
            >
              <svg
                className="w-12 h-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.4}
                aria-hidden="true"
              >
                {iconPath}
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  style={{ backgroundColor: content.themeColor }}
                  className="px-5 py-1.5 rounded-full text-xl font-bold uppercase tracking-wider text-white shadow"
                >
                  {content.verdictLabel}
                </span>
                <span className="text-2xl font-bold text-white">
                  {content.scamTypeLabel}
                </span>
              </div>
              <p className="text-xl text-slate-300 font-medium mt-2">
                {content.verdict === "safe"
                  ? "No scam patterns identified in this message."
                  : content.verdict === "suspicious"
                    ? "Warning: message contains unverified or high-pressure claims."
                    : "High risk: message contains verified fraudulent patterns."}
              </p>
            </div>
          </div>

          <div className="text-right pl-6 border-l border-white/15 shrink-0">
            <span className="text-sm uppercase tracking-wider text-slate-400 block font-semibold">
              Risk Score
            </span>
            <div className="flex items-baseline justify-end gap-1 mt-1">
              <span
                style={{ color: content.textColor }}
                className="text-5xl font-black"
              >
                {content.score}
              </span>
              <span className="text-xl text-slate-400 font-bold">/ 100</span>
            </div>
          </div>
        </div>

        {/* 2. Key Warning Signs / Red Flags */}
        <section className="bg-slate-900/80 rounded-3xl border border-white/10 p-7 shadow-xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block shadow" />
            {content.headings.keyWarningSigns}
          </h2>

          <div className="space-y-4">
            {content.flags.map((flag, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-white/5"
              >
                <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <span className="inline-block px-3 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-700/80 text-amber-200 border border-amber-300/20 mb-1">
                    {flag.category}
                  </span>
                  <p className="text-xl text-slate-200 leading-snug font-medium">
                    {flag.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Action Steps Checklist */}
        <section className="bg-slate-900/80 rounded-3xl border border-white/10 p-7 shadow-xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 inline-block shadow" />
            {content.headings.whatToDoNow}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {content.steps.map((step, idx) => {
              const is1930 = step.phone === "1930" || step.text.includes("1930");
              return (
                <div
                  key={step.id || idx}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                    is1930
                      ? "bg-rose-950/40 border-rose-500/40 text-rose-100"
                      : "bg-slate-800/60 border-white/5 text-slate-200"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                      is1930
                        ? "bg-rose-500 text-white shadow"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    ✓
                  </div>
                  <p className="text-lg font-medium leading-snug">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Mandatory Safety Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
          </div>
          <p className="text-lg text-amber-200 font-medium leading-relaxed">
            <strong className="text-amber-100 font-bold mr-2">
              {content.headings.safetyNotice}:
            </strong>
            {content.disclaimer}
          </p>
        </div>
      </main>

      {/* Footer Forward Prompt */}
      <footer className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <p className="text-lg font-medium text-slate-300">
            {content.headings.forwardFamily}
          </p>
        </div>
        <p className="text-base text-slate-500 font-mono">
          Scam Shield Safety Card · 1080×1350
        </p>
      </footer>
    </div>
  );
});

FamilyCard.propTypes = {
  /** Fused FinalVerdict object */
  verdict: PropTypes.shape({
    verdict: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    confidence: PropTypes.number.isRequired,
    scam_type: PropTypes.string,
    red_flags: PropTypes.array,
    actions: PropTypes.array,
    disclaimer: PropTypes.string.isRequired,
    degraded: PropTypes.bool,
  }).isRequired,
  /** Card language */
  lang: PropTypes.oneOf(["en", "hi"]),
};

FamilyCard.defaultProps = {
  lang: "en",
};
