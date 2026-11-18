import PropTypes from "prop-types";

/**
 * QRResultCard displays deep analysis for QR codes detected in uploaded screenshots,
 * specifically highlighting UPI "scan-to-receive" fraud traps and malicious links.
 */
export function QRResultCard({ qrResult, onDismiss }) {
  if (!qrResult || !qrResult.found) {
    return null;
  }

  const isScam = qrResult.verdict === "likely_scam";
  const isSuspicious = qrResult.verdict === "suspicious";

  const cardBorder = isScam
    ? "border-rose-500/50 bg-rose-950/20 shadow-rose-950/30"
    : isSuspicious
    ? "border-amber-500/50 bg-amber-950/20 shadow-amber-950/30"
    : "border-sky-500/50 bg-sky-950/20 shadow-sky-950/30";

  const badgeBg = isScam
    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
    : isSuspicious
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-sky-500/20 text-sky-300 border-sky-500/30";

  const badgeLabel = isScam
    ? "High-Risk QR Scam / उच्च जोखिम वाला QR घोटाला"
    : isSuspicious
    ? "Suspicious QR / संदिग्ध QR कोड"
    : "Scanned QR Code / स्कैन किया गया QR कोड";

  const upi = qrResult.upi_payload;

  return (
    <div
      role="alert"
      data-testid="qr-result-card"
      className={`rounded-2xl border p-5 shadow-xl backdrop-blur-sm transition-all ${cardBorder}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-primary">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3.75m0 3.75h3.75m-3.75 3.75h3.75M13.5 17.25h.008v.008H13.5v-.008z"
              />
            </svg>
          </div>
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeBg}`}
            >
              {badgeLabel}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-text mt-1">
              QR Code Threat Detection &middot; QR विश्लेषण
            </h3>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss QR alert"
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* UPI Deep Link Details */}
      {qrResult.qr_type === "upi" && upi && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-surface/70 border border-white/5 rounded-xl p-3">
            <div>
              <span className="text-text-muted block">Payee VPA / UPI ID:</span>
              <span className="font-mono font-bold text-text text-sm break-all">
                {upi.payee_vpa}
              </span>
            </div>
            {upi.payee_name && (
              <div>
                <span className="text-text-muted block">Claimed Name:</span>
                <span className="font-medium text-text text-sm">
                  {upi.payee_name}
                </span>
              </div>
            )}
            {upi.amount != null && (
              <div>
                <span className="text-text-muted block">Preset Debit Amount:</span>
                <span className="font-mono font-extrabold text-rose-400 text-sm">
                  ₹{upi.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {upi.transaction_note && (
              <div>
                <span className="text-text-muted block">Note in QR Code:</span>
                <span className="font-medium text-amber-300 italic text-sm">
                  &ldquo;{upi.transaction_note}&rdquo;
                </span>
              </div>
            )}
          </div>

          {/* Golden Rule Callout */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <span>🇮🇳</span>
              <span>Golden Rule of UPI / UPI का स्वर्णिम नियम</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-amber-100 leading-relaxed">
              {qrResult.safety_rule_en}
            </p>
            <p className="text-xs sm:text-sm font-medium text-amber-200/90 leading-relaxed">
              {qrResult.safety_rule_hi}
            </p>
          </div>
        </div>
      )}

      {/* URL Details */}
      {qrResult.qr_type === "url" && (
        <div className="mt-4 space-y-2">
          <div className="bg-surface/70 border border-white/5 rounded-xl p-3 text-xs">
            <span className="text-text-muted block">Target Link:</span>
            <span className="font-mono font-bold text-primary text-sm break-all">
              {qrResult.raw_text}
            </span>
          </div>
        </div>
      )}

      {/* Red Flags List */}
      {qrResult.red_flags && qrResult.red_flags.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Detected Red Flags / पकड़े गए खतरे:
          </h4>
          <ul className="space-y-1.5">
            {qrResult.red_flags.map((rf, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-text bg-white/5 rounded-lg p-2 border border-white/5"
              >
                <span className="text-rose-400 font-bold shrink-0">⚠️</span>
                <div>
                  <span className="font-bold text-rose-300">{rf.category}:</span>{" "}
                  <span className="text-text-muted">{rf.reason}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

QRResultCard.propTypes = {
  qrResult: PropTypes.shape({
    found: PropTypes.bool.isRequired,
    qr_type: PropTypes.oneOf(["upi", "url", "text", "none"]).isRequired,
    verdict: PropTypes.oneOf(["safe", "suspicious", "likely_scam"]).isRequired,
    score: PropTypes.number.isRequired,
    raw_text: PropTypes.string,
    safety_rule_en: PropTypes.string,
    safety_rule_hi: PropTypes.string,
    upi_payload: PropTypes.shape({
      payee_vpa: PropTypes.string.isRequired,
      payee_name: PropTypes.string,
      amount: PropTypes.number,
      currency: PropTypes.string,
      transaction_note: PropTypes.string,
      merchant_code: PropTypes.string,
      transaction_ref_id: PropTypes.string,
      is_valid_vpa: PropTypes.bool,
    }),
    red_flags: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string.isRequired,
        reason: PropTypes.string.isRequired,
        severity: PropTypes.string.isRequired,
      })
    ),
  }),
  onDismiss: PropTypes.func,
};

