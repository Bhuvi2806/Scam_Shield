/**
 * API client for Scam Shield backend.
 *
 * Communicates with the FastAPI backend to check system health and
 * perform multi-layer scam analysis (rule detector, Claude LLM, and
 * Google Safe Browsing URL intelligence).
 *
 * @module lib/api
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 30000;
const OCR_TIMEOUT_MS = 20000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * @typedef {Object} MergedRedFlag
 * @property {string} category Category of the indicator (e.g. urgency, authority_impersonation, suspicious_link)
 * @property {string|null} [quote] Extracted text span or direct quote from the message
 * @property {number|null} [start] Start character offset in original text (if known)
 * @property {number|null} [end] End character offset in original text (if known)
 * @property {string} reason Human-readable explanation of why this indicator is dangerous
 * @property {'rule'|'llm'|'url_local'|'url_safe_browsing'} source Detection layer that identified this flag
 */

/**
 * @typedef {Object} ActionItem
 * @property {string} id Unique action identifier (e.g. ACT-1930)
 * @property {string} text_en Action advice in plain English
 * @property {string} text_hi Action advice in Hindi (Devanagari)
 * @property {'immediate'|'important'|'info'} urgency Urgency tier
 * @property {string|null} [link] Relevant official web portal link (e.g. https://cybercrime.gov.in)
 * @property {string|null} [phone] Emergency helpline number (e.g. 1930)
 */

/**
 * @typedef {Object} FinalVerdict
 * @property {'safe'|'suspicious'|'likely_scam'} verdict Categorical risk verdict
 * @property {number} score Fused risk score between 0 and 100
 * @property {number} confidence Confidence in the assessment between 0.0 and 1.0
 * @property {string} scam_type Standardized scam category (e.g. digital_arrest, fake_kyc)
 * @property {MergedRedFlag[]} red_flags Merged red flags across detection layers
 * @property {string} explanation_en Plain-language English explanation
 * @property {string} explanation_hi Plain-language Hindi (Devanagari) explanation
 * @property {ActionItem[]} actions Prioritized safety action checklist
 * @property {string} disclaimer Official safety disclaimer
 * @property {string[]} sources_used Contributing detection layers
 * @property {boolean} degraded True if any detection layer was unavailable or skipped
 */

/**
 * @typedef {Object} AnalyzeResponse
 * @property {FinalVerdict} verdict Fused final verdict
 * @property {Object} layers Detailed layer outputs (rule, llm, url_check, llm_error)
 */

/**
 * Custom error class for API interaction failures.
 */
export class ApiError extends Error {
  /**
   * @param {string} message User-friendly error message
   * @param {number} [status] HTTP status code (0 for network/abort errors)
   * @param {string} [code] Machine-readable error code
   */
  constructor(message, status = 0, code = "UNKNOWN_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Check if the backend is reachable.
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{status: string}>}
 */
export async function healthCheck({ signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}/health`, { signal });
    if (!response.ok) {
      throw new ApiError(`Health check failed (${response.status})`, response.status, "HEALTH_CHECK_FAILED");
    }
    return await response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") {
      throw new ApiError("Health check request was aborted", 0, "ABORTED");
    }
    throw new ApiError(
      "Unable to reach the Scam Shield server. Please check your connection or backend server status.",
      0,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Analyze a message for scam indicators.
 * Calls POST /api/analyze with client-side timeout and robust error mapping.
 *
 * @param {string} text The message text to analyze
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] External abort signal
 * @param {number} [options.timeoutMs] Timeout in milliseconds (default 30,000ms)
 * @returns {Promise<AnalyzeResponse>}
 */
export async function analyzeMessage(text, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    throw new ApiError("Please enter a message to analyze.", 400, "EMPTY_INPUT");
  }

  if (trimmed.length > 10000) {
    throw new ApiError(
      `Message length (${trimmed.length.toLocaleString()} characters) exceeds the maximum allowed 10,000 characters.`,
      400,
      "INPUT_TOO_LONG"
    );
  }

  // Create an internal timeout controller linked to external signal if provided
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new ApiError("Analysis request timed out. Please try again.", 0, "TIMEOUT"));
  }, timeoutMs);

  let combinedSignal = timeoutController.signal;
  let abortListener = null;

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new ApiError("Request was cancelled.", 0, "ABORTED");
    }
    abortListener = () => {
      timeoutController.abort(new ApiError("Request was cancelled.", 0, "ABORTED"));
    };
    signal.addEventListener("abort", abortListener);
  }

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: trimmed }),
      signal: combinedSignal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errorJson = await response.json();
        if (typeof errorJson?.detail === "string") {
          detail = errorJson.detail;
        } else if (Array.isArray(errorJson?.detail) && errorJson.detail[0]?.msg) {
          detail = errorJson.detail[0].msg;
        }
      } catch {
        // Response wasn't JSON
      }

      if (response.status === 422) {
        throw new ApiError(
          detail || "Invalid message format submitted.",
          422,
          "VALIDATION_ERROR"
        );
      }
      if (response.status >= 500) {
        throw new ApiError(
          "A server error occurred while analyzing the message. Please try again shortly.",
          response.status,
          "SERVER_ERROR"
        );
      }
      throw new ApiError(
        detail || `Analysis failed with status code ${response.status}.`,
        response.status,
        "HTTP_ERROR"
      );
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") {
      throw new ApiError("Analysis request was cancelled or timed out.", 0, "ABORTED");
    }
    throw new ApiError(
      "Unable to reach the Scam Shield server. Please check your connection or ensure the backend is running.",
      0,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timer);
    if (signal && abortListener) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}

/**
 * @typedef {Object} OCRResult
 * @property {string} text Extracted text from the screenshot
 * @property {'en'|'hi'|'hinglish'} language_guess Detected language script
 * @property {number} confidence OCR confidence between 0.0 and 1.0
 * @property {boolean} low_confidence True when confidence is below threshold
 * @property {string[]} warnings Any OCR processing warnings
 */

/**
 * Client-side validation error codes for image upload.
 * @enum {string}
 */
export const OCR_ERROR_CODES = {
  INVALID_TYPE: "INVALID_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  EMPTY_FILE: "EMPTY_FILE",
  NO_TEXT_FOUND: "NO_TEXT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  OCR_UNAVAILABLE: "OCR_UNAVAILABLE",
  OCR_TIMEOUT: "OCR_TIMEOUT",
};

/**
 * Validate an image file on the client side before uploading.
 * @param {File} file
 * @throws {ApiError} if validation fails
 */
function validateImageFile(file) {
  if (!file || file.size === 0) {
    throw new ApiError("Please select an image file.", 400, OCR_ERROR_CODES.EMPTY_FILE);
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ApiError(
      "Unsupported image format. Please use PNG, JPEG, or WebP. / असमर्थित छवि प्रारूप। कृपया PNG, JPEG, या WebP का उपयोग करें।",
      400,
      OCR_ERROR_CODES.INVALID_TYPE
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new ApiError(
      `Image size (${sizeMB} MB) exceeds the 5 MB limit. / छवि का आकार (${sizeMB} MB) 5 MB सीमा से अधिक है।`,
      400,
      OCR_ERROR_CODES.FILE_TOO_LARGE
    );
  }
}

/**
 * Extract text from a screenshot image using the backend OCR endpoint.
 * Performs client-side validation before uploading. The extracted text is
 * returned for the user to review and edit before running analysis.
 *
 * @param {File} file Image file (PNG, JPEG, or WebP, max 5 MB)
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] External abort signal
 * @param {number} [options.timeoutMs] Timeout in milliseconds (default 20,000ms)
 * @returns {Promise<OCRResult>}
 */
export async function extractTextFromScreenshot(file, { signal, timeoutMs = OCR_TIMEOUT_MS } = {}) {
  // Client-side pre-validation
  validateImageFile(file);

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new ApiError("OCR request timed out. Please try again.", 0, OCR_ERROR_CODES.OCR_TIMEOUT));
  }, timeoutMs);

  let abortListener = null;

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new ApiError("Request was cancelled.", 0, "ABORTED");
    }
    abortListener = () => {
      timeoutController.abort(new ApiError("Request was cancelled.", 0, "ABORTED"));
    };
    signal.addEventListener("abort", abortListener);
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/ocr`, {
      method: "POST",
      body: formData,
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errorJson = await response.json();
        if (typeof errorJson?.detail === "string") {
          detail = errorJson.detail;
        }
      } catch {
        // Response wasn't JSON
      }

      if (response.status === 413) {
        throw new ApiError(
          detail || "Image is too large. Maximum size is 5 MB. / छवि बहुत बड़ी है। अधिकतम आकार 5 MB है।",
          413,
          OCR_ERROR_CODES.FILE_TOO_LARGE
        );
      }
      if (response.status === 400) {
        throw new ApiError(
          detail || "Invalid image format. Please use PNG, JPEG, or WebP. / अमान्य छवि प्रारूप।",
          400,
          OCR_ERROR_CODES.INVALID_TYPE
        );
      }
      if (response.status === 422) {
        throw new ApiError(
          detail || "No text could be extracted from this image. / इस छवि से कोई पाठ निकाला नहीं जा सका।",
          422,
          OCR_ERROR_CODES.NO_TEXT_FOUND
        );
      }
      if (response.status === 429) {
        throw new ApiError(
          detail || "Too many requests. Please wait a moment and try again. / बहुत अधिक अनुरोध। कृपया थोड़ा रुकें।",
          429,
          OCR_ERROR_CODES.RATE_LIMITED
        );
      }
      if (response.status === 503) {
        throw new ApiError(
          detail || "OCR service is currently unavailable. Please try again later. / OCR सेवा अभी अनुपलब्ध है।",
          503,
          OCR_ERROR_CODES.OCR_UNAVAILABLE
        );
      }
      if (response.status === 504) {
        throw new ApiError(
          detail || "OCR processing timed out. Please try a smaller or clearer image. / OCR प्रसंस्करण का समय समाप्त।",
          504,
          OCR_ERROR_CODES.OCR_TIMEOUT
        );
      }
      throw new ApiError(
        detail || `OCR request failed with status ${response.status}.`,
        response.status,
        "HTTP_ERROR"
      );
    }

    return await response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") {
      throw new ApiError("OCR request was cancelled or timed out.", 0, "ABORTED");
    }
    throw new ApiError(
      "Unable to reach the Scam Shield server for OCR. Please check your connection. / सर्वर से संपर्क नहीं हो पा रहा।",
      0,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timer);
    if (signal && abortListener) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}
