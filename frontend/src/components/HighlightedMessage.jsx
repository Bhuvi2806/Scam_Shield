import { useMemo } from "react";
import PropTypes from "prop-types";

/**
 * Merge overlapping or contiguous integer ranges [start, end].
 * @param {Array<{ start: number, end: number, categories: string[] }>} intervals
 * @returns {Array<{ start: number, end: number, categories: string[] }>}
 */
function mergeIntervals(intervals) {
  if (!intervals.length) return [];

  // Sort by start position ascending, then end position descending
  const sorted = [...intervals].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [
    {
      start: sorted[0].start,
      end: sorted[0].end,
      categories: [...sorted[0].categories],
    },
  ];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping or touching intervals: expand end and merge categories
      last.end = Math.max(last.end, current.end);
      current.categories.forEach((cat) => {
        if (!last.categories.includes(cat)) {
          last.categories.push(cat);
        }
      });
    } else {
      merged.push({
        start: current.start,
        end: current.end,
        categories: [...current.categories],
      });
    }
  }

  return merged;
}

/**
 * HighlightedMessage renders the original submitted text with red-flagged
 * text spans safely highlighted using React text nodes (zero dangerouslySetInnerHTML).
 *
 * Automatically resolves offset-based ranges, matches quote-based findings,
 * handles overlapping ranges, and silently tolerates out-of-bounds indicators.
 */
export function HighlightedMessage({ text, redFlags = [] }) {
  const segments = useMemo(() => {
    if (!text || typeof text !== "string") {
      return [];
    }

    const textLen = text.length;
    const lowerText = text.toLowerCase();
    const candidateIntervals = [];

    // 1. Collect valid intervals from offsets or quotes
    for (const flag of redFlags) {
      const category = flag.category || "Red Flag";

      // Case A: Valid explicit offsets
      if (
        typeof flag.start === "number" &&
        typeof flag.end === "number" &&
        flag.start >= 0 &&
        flag.end <= textLen &&
        flag.start < flag.end
      ) {
        candidateIntervals.push({
          start: flag.start,
          end: flag.end,
          categories: [category],
        });
        continue;
      }

      // Case B: Quote without valid offsets — match quote in text
      if (flag.quote && typeof flag.quote === "string") {
        const trimmedQuote = flag.quote.trim().toLowerCase();
        if (trimmedQuote.length > 0) {
          let searchPos = 0;
          let matchIndex = lowerText.indexOf(trimmedQuote, searchPos);

          // Find matches (limit to first 5 matches per quote to prevent runaway loops)
          let matchCount = 0;
          while (matchIndex !== -1 && matchCount < 5) {
            candidateIntervals.push({
              start: matchIndex,
              end: matchIndex + trimmedQuote.length,
              categories: [category],
            });
            matchCount++;
            searchPos = matchIndex + trimmedQuote.length;
            matchIndex = lowerText.indexOf(trimmedQuote, searchPos);
          }
        }
      }
    }

    if (!candidateIntervals.length) {
      return [{ isHighlight: false, text, key: "plain-0" }];
    }

    // 2. Merge overlapping intervals
    const mergedIntervals = mergeIntervals(candidateIntervals);

    // 3. Slice text into interleaved plain and highlighted segments
    const result = [];
    let cursor = 0;

    mergedIntervals.forEach((interval, idx) => {
      // Text before highlight
      if (interval.start > cursor) {
        result.push({
          isHighlight: false,
          text: text.slice(cursor, interval.start),
          key: `plain-${cursor}`,
        });
      }

      // Highlighted text segment
      const highlightSlice = text.slice(interval.start, interval.end);
      if (highlightSlice.length > 0) {
        result.push({
          isHighlight: true,
          text: highlightSlice,
          categories: interval.categories,
          key: `highlight-${idx}-${interval.start}`,
        });
      }

      cursor = interval.end;
    });

    // Trailing text after last highlight
    if (cursor < textLen) {
      result.push({
        isHighlight: false,
        text: text.slice(cursor),
        key: `plain-${cursor}`,
      });
    }

    return result;
  }, [text, redFlags]);

  if (!text) return null;

  return (
    <div className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Original Message Analysis
        </h3>
        {redFlags.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
            {redFlags.length} indicator{redFlags.length === 1 ? "" : "s"} highlighted
          </span>
        )}
      </div>

      <div
        data-testid="highlighted-message-container"
        className="font-mono text-xs sm:text-sm text-text/90 leading-relaxed bg-surface/80 p-4 rounded-xl border border-white/5 whitespace-pre-wrap break-words select-text"
      >
        {segments.map((seg) => {
          if (seg.isHighlight) {
            return (
              <mark
                key={seg.key}
                data-testid="red-flag-highlight"
                title={seg.categories ? `Flagged: ${seg.categories.join(", ")}` : "Flagged indicator"}
                className="bg-rose-500/30 text-rose-200 border-b-2 border-rose-500 px-0.5 rounded-xs font-semibold not-italic cursor-help transition-colors hover:bg-rose-500/40"
              >
                {seg.text}
              </mark>
            );
          }
          return <span key={seg.key}>{seg.text}</span>;
        })}
      </div>
    </div>
  );
}

HighlightedMessage.propTypes = {
  text: PropTypes.string.isRequired,
  redFlags: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      quote: PropTypes.string,
      start: PropTypes.number,
      end: PropTypes.number,
      reason: PropTypes.string,
      source: PropTypes.string,
    })
  ),
};
