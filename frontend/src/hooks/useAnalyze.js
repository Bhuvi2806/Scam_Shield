import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeMessage } from "../lib/api";

/**
 * Custom hook to manage message analysis lifecycle.
 *
 * Provides status ('idle' | 'loading' | 'success' | 'error'), submitted text,
 * result data, and error message while preventing double-submits and safely
 * managing request cancellation.
 *
 * @returns {{
 *   status: 'idle' | 'loading' | 'success' | 'error',
 *   data: import('../lib/api').AnalyzeResponse | null,
 *   error: string | null,
 *   submittedText: string,
 *   isLoading: boolean,
 *   isSuccess: boolean,
 *   isError: boolean,
 *   analyze: (text: string) => Promise<void>,
 *   reset: () => void
 * }}
 */
export function useAnalyze() {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [submittedText, setSubmittedText] = useState("");

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setData(null);
    setError(null);
    setSubmittedText("");
  }, []);

  const analyze = useCallback(
    async (text) => {
      const trimmed = typeof text === "string" ? text.trim() : "";
      if (!trimmed) {
        setError("Please enter a message to analyze.");
        setStatus("error");
        return;
      }

      // Prevent concurrent duplicate submissions while already loading
      if (status === "loading") {
        return;
      }

      // Cancel any prior in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus("loading");
      setError(null);

      try {
        const result = await analyzeMessage(trimmed, {
          signal: controller.signal,
        });

        if (!isMountedRef.current) return;

        setData(result);
        setSubmittedText(trimmed);
        setStatus("success");
      } catch (err) {
        if (!isMountedRef.current) return;
        if (err.name === "AbortError" || err.code === "ABORTED") {
          // Request was deliberately cancelled; do not display error
          return;
        }
        setError(err.message || "An unexpected error occurred during analysis.");
        setStatus("error");
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [status]
  );

  return {
    status,
    data,
    error,
    submittedText,
    isLoading: status === "loading",
    isSuccess: status === "success",
    isError: status === "error",
    analyze,
    reset,
  };
}
