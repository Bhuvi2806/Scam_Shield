import { useState, useCallback } from "react";
import { useAnalyze } from "../hooks/useAnalyze";
import { VerdictCard } from "../components/VerdictCard";
import { HighlightedMessage } from "../components/HighlightedMessage";
import { RedFlagList } from "../components/RedFlagList";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { ActionChecklist } from "../components/ActionChecklist";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { SampleMessages } from "../components/SampleMessages";
import { ImageUpload } from "../components/ImageUpload";

const MAX_CHARACTERS = 10000;

export function HomePage() {
  const [inputText, setInputText] = useState("");
  const { data, error, submittedText, isLoading, isSuccess, isError, analyze, reset } = useAnalyze();

  const trimmed = inputText.trim();
  const charCount = inputText.length;
  const isOverLimit = charCount > MAX_CHARACTERS;
  const canSubmit = trimmed.length > 0 && !isOverLimit && !isLoading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSubmit) {
      analyze(inputText);
    }
  };

  const handleClear = () => {
    setInputText("");
    reset();
  };

  const handleSelectSample = (sampleText) => {
    setInputText(sampleText);
    reset();
  };

  /** Callback from ImageUpload: populate textarea with OCR text (no auto-analyze) */
  const handleTextExtracted = useCallback((text) => {
    setInputText(text);
    reset();
  }, [reset]);

  const verdictData = data?.verdict;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Screen Reader Announcement Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="screen-reader-announcer"
      >
        {isLoading && "Analyzing message for scam patterns..."}
        {isError && `Analysis error: ${error}`}
        {isSuccess &&
          verdictData &&
          `Analysis complete: Verdict is ${verdictData.verdict}, risk score ${verdictData.score} out of 100.`}
      </div>

      {/* Input Section Card */}
      <section aria-labelledby="input-heading" className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
        <h2 id="input-heading" className="sr-only">
          Message Input
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="message-input"
              className="block text-sm font-semibold text-text"
            >
              Paste suspicious message or transcript
            </label>
            <span
              className={`text-xs font-mono font-medium ${
                isOverLimit ? "text-rose-400 font-bold" : "text-text-muted"
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
            </span>
          </div>

          <textarea
            id="message-input"
            rows={5}
            maxLength={MAX_CHARACTERS + 100}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Paste suspicious SMS, WhatsApp message, or call transcript here… उदाहरण के लिए यहाँ संदेश पेस्ट करें…"
            className="w-full resize-y min-h-[120px] sm:min-h-[140px] rounded-xl bg-surface border border-white/10 px-4 py-3 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow text-sm sm:text-base leading-relaxed"
          />

          {isOverLimit && (
            <p className="mt-1.5 text-xs text-rose-400 font-medium">
              Message exceeds the maximum limit of {MAX_CHARACTERS.toLocaleString()} characters.
            </p>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <button
              id="check-button"
              type="submit"
              disabled={!canSubmit}
              className="flex-1 min-h-[46px] px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-primary/40 active:scale-[0.99] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isLoading ? "Analyzing..." : "Check Message &middot; संदेश जांचें"}
            </button>

            {(inputText.length > 0 || isSuccess || isError) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-surface hover:bg-surface-light text-text-muted hover:text-text border border-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                Clear
              </button>
            )}
          </div>

          {/* Privacy Guarantee line */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted/80 text-center">
            <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Your message is processed in memory and never stored or shared. Screenshots are processed and discarded.</span>
          </div>

          {/* Screenshot Upload */}
          <ImageUpload onTextExtracted={handleTextExtracted} disabled={isLoading} />

          {/* One-Click Sample Messages */}
          <SampleMessages onSelect={handleSelectSample} disabled={isLoading} />
        </form>
      </section>

      {/* Analysis Results View */}
      {isLoading && <LoadingState />}

      {isError && (
        <ErrorState
          error={error}
          onRetry={() => analyze(inputText)}
          onClear={handleClear}
        />
      )}

      {isSuccess && verdictData && (
        <section aria-labelledby="results-heading" className="space-y-6">
          <h2 id="results-heading" className="sr-only">
            Analysis Results
          </h2>

          {/* 1. Main Verdict Card */}
          <VerdictCard
            verdict={verdictData.verdict}
            score={verdictData.score}
            confidence={verdictData.confidence}
            scamType={verdictData.scam_type}
          />

          {/* 2. Safety Disclaimer Banner & Degraded Notice */}
          <DisclaimerBanner
            disclaimer={verdictData.disclaimer}
            degraded={verdictData.degraded}
          />

          {/* 3. Highlighted Original Message with Red Flags */}
          <HighlightedMessage
            text={submittedText}
            redFlags={verdictData.red_flags}
          />

          {/* 4. Bilingual Plain-Language Explanation */}
          <ExplanationPanel
            explanationEn={verdictData.explanation_en}
            explanationHi={verdictData.explanation_hi}
            originalText={submittedText}
          />

          {/* 5. Detected Red Flags Breakdown */}
          <RedFlagList redFlags={verdictData.red_flags} />

          {/* 6. What To Do Now Action Checklist */}
          <ActionChecklist actions={verdictData.actions} />
        </section>
      )}
    </div>
  );
}
