import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomePage } from "../pages/HomePage";
import { ImageUpload } from "../components/ImageUpload";
import * as api from "../lib/api";
import { mockOcrSuccessResponse, mockOcrLowConfidenceResponse } from "./fixtures";

describe("ImageUpload Component & OCR Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-preview");
    } else {
      vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-preview");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts text and populates textarea without auto-running analysis", async () => {
    const ocrSpy = vi
      .spyOn(api, "extractTextFromScreenshot")
      .mockResolvedValue(mockOcrSuccessResponse);
    const analyzeSpy = vi.spyOn(api, "analyzeMessage");

    render(<HomePage />);

    const file = new File(["fake-image-bytes"], "suspicious_sms.png", {
      type: "image/png",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(ocrSpy).toHaveBeenCalledTimes(1);
    });

    // Check that the textarea is populated with the extracted text
    const textarea = screen.getByRole("textbox", {
      name: /Paste suspicious message/i,
    });
    expect(textarea.value).toBe(mockOcrSuccessResponse.text);

    // CRITICAL: Ensure analyzeMessage was NOT called automatically
    expect(analyzeSpy).not.toHaveBeenCalled();

    // Check button should now be enabled
    const checkButton = screen.getByRole("button", { name: /Check Message/i });
    expect(checkButton).toBeEnabled();
  });

  it("shows low-confidence OCR warning banner in Hindi and English", async () => {
    vi.spyOn(api, "extractTextFromScreenshot").mockResolvedValue(
      mockOcrLowConfidenceResponse
    );

    render(<HomePage />);

    const file = new File(["fake-image-bytes"], "blurry_screenshot.jpg", {
      type: "image/jpeg",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("low-confidence-warning")).toBeInTheDocument();
    });

    const warning = screen.getByTestId("low-confidence-warning");
    expect(warning.textContent).toContain("Low confidence OCR");
    expect(warning.textContent).toContain("कम विश्वसनीयता");
  });

  it("shows bilingual error message when backend returns 422 (no text found)", async () => {
    vi.spyOn(api, "extractTextFromScreenshot").mockRejectedValue(
      new api.ApiError(
        "No text could be extracted from this image.",
        422,
        api.OCR_ERROR_CODES.NO_TEXT_FOUND
      )
    );

    render(<HomePage />);

    const file = new File(["fake-image-bytes"], "scenery.png", {
      type: "image/png",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("ocr-error")).toBeInTheDocument();
    });

    const errorDiv = screen.getByTestId("ocr-error");
    expect(errorDiv.textContent).toContain("No text found");
    expect(errorDiv.textContent).toContain("कोई पाठ नहीं मिला");
  });

  it("rejects unsupported file formats client-side without calling backend", async () => {
    const ocrSpy = vi.spyOn(api, "extractTextFromScreenshot");

    render(<HomePage />);

    const invalidFile = new File(["gif-bytes"], "animation.gif", {
      type: "image/gif",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByTestId("ocr-error")).toBeInTheDocument();
    });

    expect(ocrSpy).not.toHaveBeenCalled();
    const errorDiv = screen.getByTestId("ocr-error");
    expect(errorDiv.textContent).toContain("Unsupported format");
    expect(errorDiv.textContent).toContain("असमर्थित प्रारूप");
  });

  it("rejects files exceeding 5 MB limit client-side without calling backend", async () => {
    const ocrSpy = vi.spyOn(api, "extractTextFromScreenshot");

    render(<HomePage />);

    // Create a 6MB mock file
    const largeFile = new File(["x".repeat(100)], "huge_screenshot.png", {
      type: "image/png",
    });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByTestId("ocr-error")).toBeInTheDocument();
    });

    expect(ocrSpy).not.toHaveBeenCalled();
    const errorDiv = screen.getByTestId("ocr-error");
    expect(errorDiv.textContent).toContain("exceeds 5 MB limit");
    expect(errorDiv.textContent).toContain("5 MB सीमा से अधिक");
  });

  it("creates preview URL and revokes it on remove or unmount", async () => {
    const revokeSpy = vi.spyOn(window.URL, "revokeObjectURL");
    vi.spyOn(api, "extractTextFromScreenshot").mockResolvedValue(
      mockOcrSuccessResponse
    );

    const { unmount } = render(<HomePage />);

    const file = new File(["fake-image-bytes"], "test.png", {
      type: "image/png",
    });
    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("image-preview")).toBeInTheDocument();
    });

    // Remove preview using the remove button
    const removeBtn = screen.getByRole("button", { name: /Remove uploaded image/i });
    fireEvent.click(removeBtn);

    expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost/mock-preview");
    expect(screen.queryByTestId("image-preview")).toBeNull();

    // Verify unmount cleanup also calls revokeObjectURL if a preview was active
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByTestId("image-preview")).toBeInTheDocument();
    });
    unmount();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it("guarantees zero writes to localStorage or sessionStorage (strict privacy rule)", async () => {
    vi.spyOn(api, "extractTextFromScreenshot").mockResolvedValue(
      mockOcrSuccessResponse
    );
    const localSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<HomePage />);

    const file = new File(["fake-image-bytes"], "privacy_test.png", {
      type: "image/png",
    });
    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("image-preview")).toBeInTheDocument();
    });

    // Clear
    const removeBtn = screen.getByRole("button", { name: /Remove uploaded image/i });
    fireEvent.click(removeBtn);

    expect(localSpy).not.toHaveBeenCalled();
  });

  it("handles drag and drop file upload", async () => {
    const ocrSpy = vi
      .spyOn(api, "extractTextFromScreenshot")
      .mockResolvedValue(mockOcrSuccessResponse);

    const onTextExtracted = vi.fn();
    render(<ImageUpload onTextExtracted={onTextExtracted} />);

    const dropZone = screen.getByRole("region", { name: /Screenshot upload area/i });
    const file = new File(["fake-image-bytes"], "dropped_image.webp", {
      type: "image/webp",
    });

    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain("border-primary");

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(ocrSpy).toHaveBeenCalledTimes(1);
      expect(onTextExtracted).toHaveBeenCalledWith(mockOcrSuccessResponse.text);
    });
  });

  it("handles clipboard paste file upload", async () => {
    const ocrSpy = vi
      .spyOn(api, "extractTextFromScreenshot")
      .mockResolvedValue(mockOcrSuccessResponse);

    const onTextExtracted = vi.fn();
    render(<ImageUpload onTextExtracted={onTextExtracted} />);

    const container = screen.getByTestId("image-upload");
    const file = new File(["fake-image-bytes"], "pasted_image.png", {
      type: "image/png",
    });

    fireEvent.paste(container, {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => file,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(ocrSpy).toHaveBeenCalledTimes(1);
      expect(onTextExtracted).toHaveBeenCalledWith(mockOcrSuccessResponse.text);
    });
  });
});
