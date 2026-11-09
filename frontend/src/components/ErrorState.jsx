import PropTypes from "prop-types";

/**
 * ErrorState renders a friendly, actionable error card when analysis fails.
 */
export function ErrorState({ error, onRetry, onClear }) {
  const isNetwork = error && (error.includes("reach") || error.includes("connection") || error.includes("status"));

  return (
    <div
      role="alert"
      data-testid="error-state"
      className="rounded-2xl bg-rose-950/30 border-2 border-rose-500/40 p-6 sm:p-8 shadow-xl backdrop-blur-sm text-center flex flex-col items-center justify-center gap-4"
    >
      <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>

      <div className="max-w-md">
        <h3 className="text-base sm:text-lg font-bold text-rose-200">
          Unable to Complete Analysis
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-text-muted">
          {error || "An unexpected error occurred while communicating with the Scam Shield server."}
        </p>
        {isNetwork && (
          <p className="mt-2 text-xs text-text-muted/80 bg-surface/80 p-2.5 rounded-lg border border-white/5 font-mono">
            Ensure the backend is running at http://localhost:8000.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-primary hover:bg-primary-dark text-white shadow-md transition-colors cursor-pointer"
          >
            Retry Analysis &middot; पुनः प्रयास करें
          </button>
        )}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-surface-light hover:bg-surface text-text-muted hover:text-text border border-white/10 transition-colors cursor-pointer"
          >
            Clear / नया संदेश
          </button>
        )}
      </div>
    </div>
  );
}

ErrorState.propTypes = {
  error: PropTypes.string,
  onRetry: PropTypes.func,
  onClear: PropTypes.func,
};

