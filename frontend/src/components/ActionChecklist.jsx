import { useState } from "react";
import PropTypes from "prop-types";

/**
 * ActionChecklist renders the prioritized safety steps for the user.
 *
 * Requirements:
 * - 1930 is rendered as an interactive tap-to-call link (`href="tel:1930"`).
 * - cybercrime.gov.in is rendered as an external link (`rel="noopener noreferrer"`).
 * - Users can check off steps in component state (nothing is persisted).
 * - Minimum 44px tap targets for mobile usability.
 */
export function ActionChecklist({ actions = [] }) {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
          What To Do Now &middot; तुरंत क्या करें
        </h3>
        <span className="text-xs text-text-muted">
          Tap items to track actions taken
        </span>
      </div>

      <ul className="space-y-3" role="list">
        {actions.map((item, index) => {
          const isChecked = !!checkedItems[item.id];
          const isImmediate = item.urgency === "immediate";

          return (
            <li
              key={item.id || `action-${index}`}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                isChecked
                  ? "bg-surface/50 border-white/5 opacity-75"
                  : isImmediate
                  ? "bg-rose-950/20 border-rose-500/30"
                  : "bg-surface/80 border-white/10"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Accessible 44px tap target container for checkbox */}
                <label className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCheck(item.id)}
                    className="w-5 h-5 rounded border-white/20 bg-surface-card text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  />
                  <span className="sr-only">Mark action as completed</span>
                </label>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isImmediate && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                        Urgent Action
                      </span>
                    )}
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        Call {item.phone} Helpline
                      </a>
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        Visit cybercrime.gov.in
                      </a>
                    )}
                  </div>

                  {/* Bilingual Advice Text */}
                  <p className={`text-xs sm:text-sm text-text leading-relaxed ${isChecked ? "line-through text-text-muted" : ""}`}>
                    {item.text_en}
                  </p>
                  <p className={`text-xs sm:text-sm text-text-muted mt-0.5 leading-relaxed ${isChecked ? "line-through" : ""}`}>
                    {item.text_hi}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

ActionChecklist.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text_en: PropTypes.string.isRequired,
      text_hi: PropTypes.string.isRequired,
      urgency: PropTypes.string,
      link: PropTypes.string,
      phone: PropTypes.string,
    })
  ),
};
