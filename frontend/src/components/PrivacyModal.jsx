import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * PrivacyModal presents Scam Shield's verified privacy, data handling,
 * third-party boundaries, and safety disclaimers in English and Hindi.
 *
 * ALL CLAIMS ARE VERIFIED AGAINST THE UNDERLYING CODEBASE:
 * - Messages and OCR images are processed strictly in RAM; never written to disk or database.
 * - Claude API receives message text for semantic classification (when LLM is enabled).
 * - Safe Browsing Lookup receives ONLY extracted URLs; never message text.
 * - Family Cards are rendered 100% client-side in the browser.
 * - Zero localStorage, sessionStorage, or tracking cookies.
 */
export function PrivacyModal({ isOpen, onClose }) {
  const [lang, setLang] = useState("en");
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

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
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      data-testid="privacy-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface-card border border-white/15 shadow-2xl overflow-hidden text-text"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <h2 id="privacy-modal-title" className="text-lg font-bold text-white">
                {lang === "hi" ? "गोपनीयता नीति एवं डेटा सुरक्षा" : "Privacy Policy & Data Security"}
              </h2>
              <p className="text-xs text-text-muted">
                {lang === "hi" ? "सत्यापित डेटा सुरक्षा गारंटी" : "Verified privacy guarantees"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
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
              onClick={handleClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-surface-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              aria-label={lang === "hi" ? "बंद करें" : "Close"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed text-slate-200">
          {lang === "en" ? (
            <>
              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  1. Zero Persistent Storage Guarantee
                </h3>
                <p className="text-text-muted">
                  Scam Shield processes submitted messages and screenshots <strong>strictly in volatile server memory (RAM)</strong>. Neither your message text, phone numbers, names, analysis results, nor uploaded screenshots are ever written to a hard drive, persistent database, or client storage (<code className="text-accent">localStorage</code>, <code className="text-accent">sessionStorage</code>, cookies).
                </p>
                <p className="text-text-muted">
                  Server logs record only request sizes, HTTP status codes, and latency. Log files <strong>never contain message text, phone numbers, or filenames</strong>.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  2. Third-Party API Boundaries
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
                  <li>
                    <strong className="text-slate-200">Claude API (Anthropic):</strong> If enabled, the text of the message is sent to Anthropic's Claude model over encrypted HTTPS to classify fraud patterns and generate bilingual explanations. It is not used to train models.
                  </li>
                  <li>
                    <strong className="text-slate-200">Google Safe Browsing API:</strong> If links are detected, <strong>only the extracted URLs</strong> are sent to Google's threat lookup service. Scam Shield <em>never</em> sends the surrounding message text, sender details, or personal data to Google.
                  </li>
                  <li>
                    <strong className="text-slate-200">No Analytics or Ads:</strong> There are zero third-party trackers, marketing cookies, or tracking pixels on Scam Shield.
                  </li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  3. Screenshot OCR Privacy
                </h3>
                <p className="text-text-muted">
                  Uploaded screenshots are validated in memory, stripped of EXIF metadata (camera info, GPS location, device tags), and processed by Tesseract OCR strictly in RAM. Uploaded files and temporary images are never saved to disk. Extracted text is presented to you for review before analysis is initiated.
                </p>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  4. Family Mode Share Card Security
                </h3>
                <p className="text-text-muted">
                  The WhatsApp-shareable Family Card is generated <strong>100% locally inside your web browser</strong> using bundled fonts. The card strictly excludes your original message text, quotes, and phone numbers. Nothing is uploaded or transmitted to any server when generating or sharing the card.
                </p>
              </section>

              {/* Section 5 */}
              <section className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  5. Important Safety Disclaimers
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-amber-200/90 leading-relaxed">
                  <li>
                    <strong>Not Legal Advice / Not a Police Agency:</strong> Scam Shield is an AI-assisted educational awareness tool. It does not replace reporting to official law enforcement authorities.
                  </li>
                  <li>
                    <strong>Never 100% Safe:</strong> Even if a message receives a &ldquo;Safe&rdquo; verdict, cybercriminals constantly invent new tactics. Never share OTPs, passwords, ATM PINs, or transfer funds to unknown contacts.
                  </li>
                  <li>
                    <strong>Emergency Reporting:</strong> If money has been debited or you are under immediate coercion, call the <strong>National Cyber Crime Helpline at 1930</strong> immediately and register an official complaint at <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">cybercrime.gov.in</a>.
                  </li>
                </ul>
              </section>
            </>
          ) : (
            <>
              {/* Hindi Translation */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  1. शून्य डेटा संग्रहण गारंटी (Zero Storage)
                </h3>
                <p className="text-text-muted">
                  स्कैम शील्ड आपके संदेशों और स्क्रीनशॉट को <strong>केवल सर्वर की अस्थाई मेमोरी (RAM) में प्रोसेस करता है</strong>। आपका कोई भी संदेश, फोन नंबर, नाम, विश्लेषण परिणाम या स्क्रीनशॉट हार्ड डिस्क, डेटाबेस या ब्राउज़र स्टोरेज (<code className="text-accent">localStorage</code>, <code className="text-accent">cookies</code>) में कभी सेव नहीं किया जाता।
                </p>
                <p className="text-text-muted">
                  सर्वर लॉग में केवल अनुरोध का आकार और स्टेटस कोड दर्ज होता है। लॉग में <strong>संदेश का टेक्स्ट या व्यक्तिगत डेटा कभी शामिल नहीं होता</strong>।
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  2. बाहरी सेवाएँ और डेटा सीमाएँ
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
                  <li>
                    <strong className="text-slate-200">Claude API (Anthropic):</strong> यदि यह सुविधा सक्रिय है, तो घोटाले के पैटर्न को समझने और हिंदी/अंग्रेजी में समझाने के लिए संदेश सुरक्षित HTTPS के माध्यम से भेजा जाता है। इसे मॉडल प्रशिक्षण के लिए उपयोग नहीं किया जाता।
                  </li>
                  <li>
                    <strong className="text-slate-200">Google Safe Browsing:</strong> यदि संदेश में कोई लिंक है, तो <strong>केवल निकाला गया URL</strong> गूगल की सुरक्षा जांच सेवा को भेजा जाता है। संदेश का टेक्स्ट या आपकी कोई निजी जानकारी कभी नहीं भेजी जाती।
                  </li>
                  <li>
                    <strong className="text-slate-200">कोई विज्ञापन या ट्रैकर नहीं:</strong> वेबसाइट पर कोई व्यावसायिक ट्रैकर या विज्ञापन कुकीज़ नहीं हैं।
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  3. स्क्रीनशॉट OCR सुरक्षा
                </h3>
                <p className="text-text-muted">
                  अपलोड किए गए स्क्रीनशॉट से EXIF मेटाडेटा (जैसे कैमरा, स्थान) तुरंत हटा दिया जाता है। टेक्स्ट निकालने के बाद छवि तुरंत नष्ट कर दी जाती है। निकाले गए टेक्स्ट को आप जांच से पहले स्वयं देख और संपादित कर सकते हैं।
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  4. फैमिली मोड शेयर कार्ड गोपनीयता
                </h3>
                <p className="text-text-muted">
                  व्हाट्सएप पर साझा करने योग्य कार्ड <strong>100% आपके ब्राउज़र के अंदर तैयार होता है</strong>। इसमें आपका मूल संदेश, बैंक विवरण या उद्धरण कभी शामिल नहीं होते। कार्ड बनाने के लिए किसी सर्वर पर कोई डेटा नहीं भेजा जाता।
                </p>
              </section>

              <section className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  5. महत्वपूर्ण सुरक्षा अस्वीकरण (Disclaimers)
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-amber-200/90 leading-relaxed">
                  <li>
                    <strong>कानूनी सलाह नहीं / पुलिस एजेंसी नहीं:</strong> स्कैम शील्ड केवल एक जागरूकता और सहायता टूल है। यह आधिकारिक पुलिस या साइबर सेल की जगह नहीं ले सकता।
                  </li>
                  <li>
                    <strong>कभी भी 100% सुरक्षित नहीं:</strong> यदि परिणाम &ldquo;सुरक्षित&rdquo; आता है, तब भी किसी अज्ञात कॉलर या मैसेज पर OTP, पासवर्ड या पैसे कभी न भेजें।
                  </li>
                  <li>
                    <strong>आपातकालीन सहायता:</strong> यदि पैसे कट गए हैं, तो तुरंत <strong>1930 राष्ट्रीय साइबर हेल्पलाइन</strong> पर कॉल करें और <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">cybercrime.gov.in</a> पर शिकायत दर्ज कराएं।
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-surface flex items-center justify-between shrink-0">
          <span className="text-xs text-text-muted">
            Scam Shield · Open Source Fraud Protection
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
          >
            {lang === "hi" ? "समझ गया / बंद करें" : "Understood / Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

PrivacyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
