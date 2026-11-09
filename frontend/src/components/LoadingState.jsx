/**
 * Accessible loading indicator displayed while message analysis is in flight.
 */
export function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="loading-state"
      className="rounded-2xl bg-surface-card border border-white/10 p-8 sm:p-10 shadow-xl backdrop-blur-sm text-center flex flex-col items-center justify-center gap-4"
    >
      <div className="relative flex items-center justify-center w-14 h-14">
        {/* Animated pulse halo */}
        <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-75" />
        <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>

      <div>
        <h3 className="text-base sm:text-lg font-semibold text-text">
          Analyzing Message Threat Signals…
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-text-muted max-w-sm">
          Checking scam patterns, Google Safe Browsing threat databases, and safety heuristics…
        </p>
        <p className="mt-1 text-xs text-text-muted/70">
          संदेश पैटर्न और जोखिम संकेतकों का विश्लेषण किया जा रहा है…
        </p>
      </div>
    </div>
  );
}

