import { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { extractTextFromScreenshot, ApiError, OCR_ERROR_CODES } from "../lib/api";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Bilingual error messages keyed by OCR error code.
 */
const ERROR_MESSAGES = {
  [OCR_ERROR_CODES.INVALID_TYPE]:
    "Unsupported format. Use PNG, JPEG, or WebP. / असमर्थित प्रारूप। PNG, JPEG, या WebP का उपयोग करें।",
  [OCR_ERROR_CODES.FILE_TOO_LARGE]:
    "Image exceeds 5 MB limit. / छवि 5 MB सीमा से अधिक है।",
  [OCR_ERROR_CODES.EMPTY_FILE]:
    "Selected file is empty. / चयनित फ़ाइल खाली है।",
  [OCR_ERROR_CODES.NO_TEXT_FOUND]:
    "No text found in this image. Try a clearer screenshot. / इस छवि में कोई पाठ नहीं मिला। कृपया स्पष्ट स्क्रीनशॉट आज़माएं।",
  [OCR_ERROR_CODES.RATE_LIMITED]:
    "Too many requests. Please wait and try again. / बहुत अधिक अनुरोध। कृपया थोड़ा रुकें।",
  [OCR_ERROR_CODES.OCR_UNAVAILABLE]:
    "OCR service is currently unavailable. / OCR सेवा अभी अनुपलब्ध है।",
  [OCR_ERROR_CODES.OCR_TIMEOUT]:
    "OCR processing timed out. Try a smaller image. / OCR प्रसंस्करण का समय समाप्त। छोटी छवि आज़माएं।",
};

/**
 * Screenshot upload component with drag-and-drop, clipboard paste,
 * and file picker. Extracts text via OCR and populates the parent
 * textarea without auto-running analysis.
 *
 * Privacy: zero localStorage/sessionStorage/cookie writes, no console.log.
 */
export function ImageUpload({ onTextExtracted, disabled }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  // Clean up preview URL and abort on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [previewUrl]);

  const clearState = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPreviewUrl(null);
    setFileName("");
    setError(null);
    setLowConfidenceWarning(false);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  /**
   * Client-side validation before upload.
   * @param {File} file
   * @returns {string|null} Error message or null if valid.
   */
  const validateFile = useCallback((file) => {
    if (!file || file.size === 0) {
      return ERROR_MESSAGES[OCR_ERROR_CODES.EMPTY_FILE];
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return ERROR_MESSAGES[OCR_ERROR_CODES.INVALID_TYPE];
    }
    if (file.size > MAX_SIZE_BYTES) {
      return ERROR_MESSAGES[OCR_ERROR_CODES.FILE_TOO_LARGE];
    }
    return null;
  }, []);

  const processFile = useCallback(
    async (file) => {
      if (!file || disabled) return;

      // Clear previous state
      clearState();

      // Client-side validation
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setFileName(file.name);
      setIsProcessing(true);
      setError(null);
      setLowConfidenceWarning(false);

      // Upload for OCR
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await extractTextFromScreenshot(file, {
          signal: controller.signal,
        });

        if (result.low_confidence) {
          setLowConfidenceWarning(true);
        }

        // Populate parent textarea — does NOT auto-analyze
        onTextExtracted(result.text);
      } catch (err) {
        if (err instanceof ApiError) {
          const msg =
            ERROR_MESSAGES[err.code] || err.message;
          setError(msg);
        } else if (err.name !== "AbortError" && err.code !== "ABORTED") {
          setError(
            "An unexpected error occurred during OCR. / OCR के दौरान एक अप्रत्याशित त्रुटि हुई।"
          );
        }
      } finally {
        setIsProcessing(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [disabled, clearState, validateFile, onTextExtracted]
  );

  // --- File input handler ---
  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // --- Drag and drop handlers ---
  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  // --- Clipboard paste handler ---
  const handlePaste = useCallback(
    (e) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === "file" && ALLOWED_TYPES.has(item.type)) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processFile(file);
          return;
        }
      }
    },
    [disabled, processFile]
  );

  const handleRemove = useCallback(() => {
    clearState();
  }, [clearState]);

  return (
    <div
      data-testid="image-upload"
      onPaste={handlePaste}
      className="mt-3"
    >
      {/* Drop zone */}
      <div
        role="region"
        aria-label="Screenshot upload area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-colors p-4 text-center ${
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-white/15 hover:border-white/30"
        } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isProcessing) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        tabIndex={disabled ? -1 : 0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload screenshot image"
          data-testid="file-input"
        />

        {/* Icon */}
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-8 h-8 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-primary">Upload screenshot</span>{" "}
            or drag & drop or paste (Ctrl+V)
          </p>
          <p className="text-xs text-text-muted/60">
            PNG, JPEG, WebP · Max 5 MB · स्क्रीनशॉट अपलोड करें
          </p>
        </div>
      </div>

      {/* Processing spinner */}
      {isProcessing && (
        <div
          data-testid="ocr-processing"
          className="mt-3 flex items-center gap-2 text-sm text-accent"
          role="status"
          aria-live="polite"
        >
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Extracting text… / पाठ निकाला जा रहा है…</span>
        </div>
      )}

      {/* Preview and remove */}
      {previewUrl && !isProcessing && (
        <div
          data-testid="image-preview"
          className="mt-3 flex items-start gap-3 rounded-lg bg-surface-light/50 p-3"
        >
          <img
            src={previewUrl}
            alt="Uploaded screenshot preview"
            className="w-16 h-16 object-cover rounded-lg border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text truncate">{fileName}</p>
            {lowConfidenceWarning && (
              <p
                data-testid="low-confidence-warning"
                className="mt-1 text-xs text-amber-400"
                role="alert"
              >
                ⚠ Low confidence OCR — please review and correct the extracted text. /
                कम विश्वसनीयता — कृपया निकाले गए पाठ की समीक्षा करें।
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-rose-400 hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="Remove uploaded image"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          data-testid="ocr-error"
          className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-300"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}

ImageUpload.propTypes = {
  /** Callback receiving extracted text to populate the parent textarea */
  onTextExtracted: PropTypes.func.isRequired,
  /** Whether the component should be disabled (e.g. during analysis) */
  disabled: PropTypes.bool,
};

ImageUpload.defaultProps = {
  disabled: false,
};

