import PropTypes from "prop-types";

/**
 * Format source key to accessible plain-language badge.
 * @param {string} source
 * @returns {{ label: string, badgeClass: string }}
 */
function getSourceBadge(source) {
  switch (source) {
    case "rule":
      return {
        label: "Rule Pattern",
        badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      };
    case "llm":
      return {
        label: "AI Semantic Analysis",
        badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      };
    case "url_safe_browsing":
      return {
        label: "Google Safe Browsing",
        badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      };
    case "url_local":
      return {
        label: "URL Heuristics",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      };
    default:
      return {
        label: "Security Detection",
        badgeClass: "bg-surface-light text-text-muted border-white/10",
      };
  }
}

/**
 * RedFlagList renders a structured breakdown of each detected red flag,
 * including its category, plain-language reason, quote, and detection source.
 * Defanged URLs remain strictly plain text and are never clickable links.
 */
export function RedFlagList({ redFlags = [] }) {
  if (!redFlags || redFlags.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Detected Red Flags
        </h3>
        <p className="text-xs sm:text-sm text-text-muted">
          No concrete scam indicators or high-risk patterns were detected in this message.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
          </svg>
          Detected Red Flags ({redFlags.length})
        </h3>
      </div>

      <ul className="space-y-3" role="list">
        {redFlags.map((flag, idx) => {
          const badge = getSourceBadge(flag.source);
          return (
            <li
              key={`flag-${idx}-${flag.category}`}
              className="p-3.5 sm:p-4 rounded-xl bg-surface/80 border border-white/5 flex flex-col gap-2 transition-colors hover:border-white/15"
            >
              {/* Category & Source Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                  {flag.category.replace(/_/g, " ")}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badge.badgeClass}`}>
                  {badge.label}
                </span>
              </div>

              {/* Quote snippet (defanged URLs remain plain text) */}
              {flag.quote && (
                <div className="font-mono text-xs text-text-muted bg-surface-card/60 px-2.5 py-1.5 rounded border border-white/5 break-words select-text">
                  &ldquo;{flag.quote}&rdquo;
                </div>
              )}

              {/* Reason description */}
              <p className="text-xs sm:text-sm text-text/80 leading-normal">
                {flag.reason}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

RedFlagList.propTypes = {
  redFlags: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      reason: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
      quote: PropTypes.string,
    })
  ),
};

