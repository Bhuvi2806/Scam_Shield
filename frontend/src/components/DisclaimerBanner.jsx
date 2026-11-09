import PropTypes from "prop-types";

/**
 * DisclaimerBanner displays safety disclaimers and degraded status warnings.
 *
 * Rules:
 * - Always shows verdict.disclaimer.
 * - Shows limited analysis notice when degraded is true.
 * - Guarantees "100% safe" never appears.
 */
export function DisclaimerBanner({ disclaimer, degraded = false }) {
  if (!disclaimer) return null;

  // Sanitization guard: ensures "100% safe" never renders
  const cleanDisclaimer = disclaimer
    .replace(/100%\s*safe/gi, "safe")
    .replace(/completely\s*safe/gi, "safe");

  return (
    <aside aria-label="Security Disclaimers" className="space-y-3">
      {/* Degraded mode warning if any external layer was unavailable */}
      {degraded && (
        <div
          role="status"
          data-testid="degraded-warning-banner"
          className="rounded-xl bg-amber-950/30 border border-amber-500/40 p-3.5 sm:p-4 text-xs sm:text-sm text-amber-200 flex items-start gap-2.5"
        >
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-semibold block text-amber-300">
              Limited Analysis Notice / सीमित विश्लेषण सूचना
            </span>
            <span>
              Deep AI analysis or link verification was temporarily unavailable. This verdict was generated using rule-based pattern checks.
            </span>
          </div>
        </div>
      )}

      {/* Primary safety disclaimer */}
      <div className="rounded-xl bg-surface/60 border border-white/5 p-3.5 sm:p-4 text-xs text-text-muted/80 leading-relaxed text-center">
        <p data-testid="verdict-disclaimer">
          {cleanDisclaimer}
        </p>
      </div>
    </aside>
  );
}

DisclaimerBanner.propTypes = {
  disclaimer: PropTypes.string.isRequired,
  degraded: PropTypes.bool,
};

