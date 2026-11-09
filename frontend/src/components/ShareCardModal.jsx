import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { FamilyCard } from "./FamilyCard";
import {
  captureCardAsBlob,
  captureCardAsFile,
  triggerBlobDownload,
  canShareFiles,
  getWhatsAppShareUrl,
} from "../lib/shareCard";
import { buildShareText } from "../lib/cardContent";
import { STRINGS } from "../lib/strings";

/**
 * Accessible modal dialog for previewing and sharing the Family Mode safety card.
 *
 * ACCESSIBILITY & PRIVACY:
 * - Focus trapped within modal; Escape closes modal.
 * - Minimum 44px tap targets for mobile touch.
 * - In-memory object URLs only; revoked on modal close and language switch.
 * - Zero localStorage/sessionStorage/cookie writes.
 * - Pure React text nodes.
 */
export function ShareCardModal({ isOpen, onClose, verdict }) {
  const [lang, setLang] = useState("en");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const cardRef = useRef(null);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Manage preview object URL lifecycle
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Generate PNG image from FamilyCard DOM node
  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    setError(null);
    setStatusMessage(lang === "hi" ? "कार्ड तैयार हो रहा है..." : "Generating safety card...");

    try {
      const generatedBlob = await captureCardAsBlob(cardRef.current);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newUrl = URL.createObjectURL(generatedBlob);
      setBlob(generatedBlob);
      setPreviewUrl(newUrl);
      setStatusMessage(lang === "hi" ? "कार्ड तैयार है" : "Card ready to share");
    } catch (err) {
      setError(
        lang === "hi"
          ? "कार्ड छवि बनाने में असमर्थ। आप नीचे दिए गए टेक्स्ट विकल्पों का उपयोग कर सकते हैं।"
          : "Could not generate card image. You can still use the text sharing options below."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [lang, previewUrl]);

  // Regenerate image when modal opens or language changes
  useEffect(() => {
    if (isOpen) {
      // Delay slightly for initial DOM render and font readiness
      const timer = setTimeout(() => {
        generateImage();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setBlob(null);
      setError(null);
      setCopied(false);
      setStatusMessage("");
    }
  }, [isOpen, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    closeButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Simple focus trap within modalRef
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !verdict) return null;

  const labels = STRINGS.labels;
  const supportsFileShare = canShareFiles();
  const shareText = buildShareText(verdict, lang);
  const whatsAppUrl = getWhatsAppShareUrl(shareText);

  // --- Handlers ---
  const handleNativeShare = async () => {
    if (!blob) return;
    try {
      const file = new File([blob], `scam-shield-${verdict.verdict}.png`, {
        type: "image/png",
      });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: lang === "hi" ? "स्कैम शील्ड सुरक्षा चेतावनी" : "Scam Shield Fraud Alert",
          text: lang === "hi" ? "यह संदेश देखें और सतर्क रहें।" : "Please check this safety warning.",
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(
          lang === "hi"
            ? "साझा करने में समस्या आई। कृपया छवि डाउनलोड करें।"
            : "Sharing was not completed. You can download the card instead."
        );
      }
    }
  };

  const handleDownload = () => {
    if (!blob) return;
    triggerBlobDownload(blob, `scam-shield-${verdict.verdict}.png`);
  };

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setError(
        lang === "hi" ? "टेक्स्ट कॉपी नहीं हो सका।" : "Could not copy text to clipboard."
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* Hidden Full-Resolution FamilyCard node for capture */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          pointerEvents: "none",
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <FamilyCard ref={cardRef} verdict={verdict} lang={lang} />
      </div>

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-surface-card border border-white/15 shadow-2xl overflow-hidden text-text"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface">
          <div>
            <h2 id="share-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              {labels.shareWithFamily[lang]}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {lang === "hi"
                ? "व्हाट्सएप पर परिवार और दोस्तों को सचेत करें"
                : "Help protect elderly relatives and family on WhatsApp"}
            </p>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-surface-light p-1 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`min-h-[36px] px-3 py-1 rounded-md transition-colors ${
                  lang === "en"
                    ? "bg-primary text-white shadow"
                    : "text-text-muted hover:text-white"
                }`}
                aria-pressed={lang === "en"}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`min-h-[36px] px-3 py-1 rounded-md transition-colors ${
                  lang === "hi"
                    ? "bg-primary text-white shadow"
                    : "text-text-muted hover:text-white"
                }`}
                aria-pressed={lang === "hi"}
              >
                हिन्दी
              </button>
            </div>

            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-surface-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              aria-label={labels.close[lang]}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Card Preview Container */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-surface border border-white/10 p-3 min-h-[280px]">
            {isGenerating && (
              <div className="flex flex-col items-center gap-3 py-12 text-accent" role="status">
                <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-medium">
                  {lang === "hi" ? "कार्ड तैयार हो रहा है..." : "Generating card preview..."}
                </p>
              </div>
            )}

            {!isGenerating && previewUrl && (
              <div className="relative group max-w-[340px] shadow-2xl rounded-xl overflow-hidden border border-white/15">
                <img
                  src={previewUrl}
                  alt={`Safety alert card for ${verdict.verdict}: ${verdict.scam_type}`}
                  className="w-full h-auto object-contain block"
                  data-testid="family-card-preview-img"
                />
              </div>
            )}

            {error && (
              <div className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
                {error}
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-text-muted text-center leading-relaxed">
            🛡️ {lang === "hi"
              ? "इस कार्ड में केवल सुरक्षा निष्कर्ष और हेल्पलाइन नंबर हैं। आपका मूल संदेश या कोई निजी जानकारी शामिल नहीं है।"
              : "This card contains only safety advice and helpline numbers. Original message text and personal data are never included."}
          </p>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-surface flex flex-col sm:flex-row items-center gap-3">
          {/* Native Web Share Button (if supported) */}
          {supportsFileShare && (
            <button
              type="button"
              disabled={isGenerating || !blob}
              onClick={handleNativeShare}
              className="w-full sm:flex-1 min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              {labels.shareNative[lang]}
            </button>
          )}

          {/* Download Image Button */}
          <button
            type="button"
            disabled={isGenerating || !blob}
            onClick={handleDownload}
            className={`w-full ${supportsFileShare ? "sm:w-auto" : "sm:flex-1"} min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm bg-surface-light hover:bg-slate-700 text-white border border-white/10 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20`}
          >
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {labels.downloadPng[lang]}
          </button>

          {/* Share Text on WhatsApp Link */}
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
            </svg>
            {labels.shareWhatsApp[lang]}
          </a>

          {/* Copy Text Fallback */}
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full sm:w-auto min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-surface hover:bg-surface-light text-text-muted hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            {copied ? (
              <span className="text-emerald-400 font-bold">✓ {labels.copied[lang]}</span>
            ) : (
              <span>{labels.copyText[lang]}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

ShareCardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  verdict: PropTypes.object,
};
