import PropTypes from "prop-types";

/**
 * Format raw snake_case scam type to human-readable label.
 * @param {string} type
 * @returns {string}
 */
function formatScamType(type) {
  if (!type || type === "none") return "";
  const map = {
    digital_arrest: "Digital Arrest Fraud",
    fake_kyc: "Fake KYC Deactivation Threat",
    upi_refund: "UPI / Refund Reversal Scam",
    job_task_scam: "Work-from-Home / Part-Time Job Scam",
    lottery_prize: "Lottery / Prize Impersonation",
    electricity_bill_threat: "Electricity Bill Disconnection Threat",
    other: "Suspicious Fraud Pattern",
  };
  return map[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Convert numerical confidence (0.0 - 1.0) into accessible level label.
 * @param {number} confidence
 * @returns {{ label: string, detail: string }}
 */
function getConfidenceLevel(confidence) {
  const num = typeof confidence === "number" ? confidence : 0.7;
  if (num >= 0.85) {
    return { label: "High Confidence", detail: `${Math.round(num * 100)}% signal alignment` };
  }
  if (num >= 0.65) {
    return { label: "Moderate Confidence", detail: `${Math.round(num * 100)}% signal alignment` };
  }
  return { label: "Preliminary Assessment", detail: `${Math.round(num * 100)}% signal alignment` };
}

/**
 * VerdictCard renders a high-visibility, multi-modal risk assessment card.
 * Adheres strictly to accessibility rules: uses color AND icon AND text label.
 */
export function VerdictCard({ verdict, score, confidence, scamType }) {
  const confLevel = getConfidenceLevel(confidence);
  const scamTypeLabel = formatScamType(scamType);

  let theme = {
    bg: "bg-rose-950/40",
    border: "border-rose-600/60",
    text: "text-rose-200",
    badgeBg: "bg-rose-600 text-white",
    title: "Likely Scam",
    titleHi: "संभावित घोटाला",
    subtitle: "High-risk scam indicators detected. Do not click links or send money.",
    icon: (
      <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 18.75h.007v.008H12v-.008z" />
      </svg>
    ),
  };

  if (verdict === "safe") {
    theme = {
      bg: "bg-emerald-950/40",
      border: "border-emerald-600/60",
      text: "text-emerald-200",
      badgeBg: "bg-emerald-600 text-white",
      title: "Safe",
      titleHi: "सुरक्षित",
      subtitle: "No known scam patterns detected. Always remain vigilant with personal data.",
      icon: (
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    };
  } else if (verdict === "suspicious") {
    theme = {
      bg: "bg-amber-950/40",
      border: "border-amber-600/60",
      text: "text-amber-200",
      badgeBg: "bg-amber-600 text-white",
      title: "Suspicious",
      titleHi: "संदिग्ध",
      subtitle: "Caution advised. Contains urgency, pressure tactics, or unverified claims.",
      icon: (
        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    };
  }

  return (
    <div
      role="region"
      aria-label={`Verdict: ${theme.title}`}
      className={`rounded-2xl ${theme.bg} border-2 ${theme.border} p-5 sm:p-6 shadow-xl backdrop-blur-sm transition-all`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Icon + Label + Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-surface/80 border border-white/10 shrink-0">
            {theme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${theme.badgeBg}`}>
                {theme.title} &middot; {theme.titleHi}
              </span>
              {scamTypeLabel && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface/80 text-text-muted border border-white/10">
                  {scamTypeLabel}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-text-muted max-w-md">
              {theme.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Risk Score & Confidence Level */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-xs uppercase tracking-wider text-text-muted block">
              Risk Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-extrabold ${theme.text}`}>
                {score}
              </span>
              <span className="text-xs text-text-muted font-medium">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium bg-surface/90 text-text-muted border border-white/10" title={confLevel.detail}>
              {confLevel.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

VerdictCard.propTypes = {
  verdict: PropTypes.oneOf(["safe", "suspicious", "likely_scam"]).isRequired,
  score: PropTypes.number.isRequired,
  confidence: PropTypes.number.isRequired,
  scamType: PropTypes.string,
};
