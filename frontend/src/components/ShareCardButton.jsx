import PropTypes from "prop-types";

/**
 * High-visibility trigger button to open the Family Mode share modal.
 */
export function ShareCardButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="share-card-button"
      className="w-full min-h-[48px] px-5 py-3 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-indigo-600 via-indigo-700 to-primary text-white shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer border border-indigo-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <span className="text-lg">🛡️</span>
      <span>Share with family &middot; परिवार के साथ साझा करें</span>
      <svg
        className="w-4 h-4 ml-1 opacity-80"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>
    </button>
  );
}

ShareCardButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

ShareCardButton.defaultProps = {
  disabled: false,
};

