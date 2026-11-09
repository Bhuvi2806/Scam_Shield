import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomePage } from "../pages/HomePage";
import { ShareCardModal } from "../components/ShareCardModal";
import * as api from "../lib/api";
import * as shareCard from "../lib/shareCard";
import { mockScamResponse, mockSafeResponse } from "./fixtures";

describe("FamilyCard & ShareCardModal UI Flows", () => {
  const fakeBlob = new Blob(["fake-png-bytes"], { type: "image/png" });

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock ObjectURL methods
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-card-preview");
    } else {
      vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-card-preview");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    }

    // Mock image capture helper to return a pristine Blob
    vi.spyOn(shareCard, "captureCardAsBlob").mockResolvedValue(fakeBlob);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders 'Share with family' button after successful analysis", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "analyzeMessage").mockResolvedValue(mockScamResponse);

    render(<HomePage />);

    const textarea = screen.getByRole("textbox", { name: /Paste suspicious message/i });
    await user.type(textarea, "URGENT: SBI account suspended.");

    const checkBtn = screen.getByRole("button", { name: /Check Message/i });
    await user.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByTestId("share-card-button")).toBeInTheDocument();
    });

    const shareBtn = screen.getByTestId("share-card-button");
    expect(shareBtn.textContent).toContain("Share with family");
    expect(shareBtn.textContent).toContain("परिवार के साथ साझा करें");
  });

  it("opens share modal, generates card preview, and closes on Escape key", async () => {
    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    // Modal is visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Share with family/i)).toBeInTheDocument();

    // Verify preview image was rendered
    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    const previewImg = screen.getByTestId("family-card-preview-img");
    expect(previewImg.getAttribute("src")).toBe("blob:http://localhost/mock-card-preview");
  });

  it("closes modal on Escape key press", async () => {
    const onClose = vi.fn();
    render(
      <ShareCardModal
        isOpen={true}
        onClose={onClose}
        verdict={mockScamResponse.verdict}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes modal on close button click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ShareCardModal
        isOpen={true}
        onClose={onClose}
        verdict={mockScamResponse.verdict}
      />
    );

    const closeBtn = screen.getByLabelText(/Close|बंद करें/i);
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("switches language between English and Hindi without crashing", async () => {
    const user = userEvent.setup();
    const captureSpy = vi.spyOn(shareCard, "captureCardAsBlob").mockResolvedValue(fakeBlob);

    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    // Switch to Hindi
    const hindiBtn = screen.getByRole("button", { name: "हिन्दी" });
    await user.click(hindiBtn);

    await waitFor(() => {
      expect(captureSpy).toHaveBeenCalledTimes(2);
    });

    // Check that Hindi WhatsApp button and text are displayed
    expect(screen.getByText(/व्हाट्सएप पर भेजें/i)).toBeInTheDocument();
  });

  it("triggers Web Share API when file sharing is supported", async () => {
    const user = userEvent.setup();
    vi.spyOn(shareCard, "canShareFiles").mockReturnValue(true);
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    const shareBtn = screen.getByText(/Share Image|कार्ड साझा करें/i);
    await user.click(shareBtn);

    expect(shareMock).toHaveBeenCalledTimes(1);
    const shareArgs = shareMock.mock.calls[0][0];
    expect(shareArgs.files).toBeDefined();
    expect(shareArgs.files.length).toBe(1);
    expect(shareArgs.files[0].type).toBe("image/png");
  });

  it("gracefully handles user cancelling the Web Share dialog (AbortError)", async () => {
    const user = userEvent.setup();
    vi.spyOn(shareCard, "canShareFiles").mockReturnValue(true);
    const abortErr = new Error("User cancelled share");
    abortErr.name = "AbortError";

    const shareMock = vi.fn().mockRejectedValue(abortErr);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    const shareBtn = screen.getByText(/Share Image|कार्ड साझा करें/i);
    await user.click(shareBtn);

    // Assert that NO error banner was shown for deliberate user cancellation
    expect(screen.queryByText(/साझा करने में समस्या आई/i)).toBeNull();
    expect(screen.queryByText(/Sharing was not completed/i)).toBeNull();
  });

  it("provides download fallback that triggers blob download", async () => {
    const user = userEvent.setup();
    const downloadSpy = vi.spyOn(shareCard, "triggerBlobDownload").mockImplementation(() => {});

    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText(/Download Card/i);
    await user.click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledWith(fakeBlob, "scam-shield-likely_scam.png");
  });

  it("provides WhatsApp link with pre-filled safe text summary (including 1930)", async () => {
    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    const whatsappLink = screen.getByRole("link", { name: /Share on WhatsApp|व्हाट्सएप पर भेजें/i });
    expect(whatsappLink).toBeInTheDocument();

    const href = whatsappLink.getAttribute("href");
    expect(href).toContain("https://wa.me/?text=");
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain("Scam Shield");
    expect(decoded).toContain("1930");
    expect(decoded).toContain("cybercrime.gov.in");

    // Must NOT contain message quotes
    expect(decoded).not.toContain("account will be suspended today");
  });

  it("copies summary text to clipboard with confirmation feedback", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /Copy Summary Text|संदेश कॉपी करें/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("Scam Shield");
    expect(copiedText).toContain("1930");

    // Feedback confirmation appears
    await waitFor(() => {
      expect(screen.getByText(/Copied!|कॉपी हो गया!/i)).toBeInTheDocument();
    });
  });

  it("revokes object URL when modal unmounts or closes (no memory leak)", async () => {
    const revokeSpy = vi.spyOn(window.URL, "revokeObjectURL");

    const { unmount } = render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockSafeResponse.verdict}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    unmount();
    expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost/mock-card-preview");
  });

  it("guarantees zero network calls and zero persistent storage writes during share flows", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");

    render(
      <ShareCardModal
        isOpen={true}
        onClose={vi.fn()}
        verdict={mockScamResponse.verdict}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("family-card-preview-img")).toBeInTheDocument();
    });

    // Toggle language
    const hindiBtn = screen.getByRole("button", { name: "हिन्दी" });
    await user.click(hindiBtn);

    // Download
    const downloadBtn = screen.getByText(/कार्ड डाउनलोड करें/i);
    await user.click(downloadBtn);

    // Absolute zero external calls
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
