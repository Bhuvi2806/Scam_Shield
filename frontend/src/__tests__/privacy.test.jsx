import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyModal } from "../components/PrivacyModal";
import App from "../App";

describe("PrivacyModal & Privacy Notices", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders privacy policy modal with clear English guarantees by default", () => {
    render(<PrivacyModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy & Data Security/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Persistent Storage Guarantee/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude API \(Anthropic\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Safe Browsing API/i)).toBeInTheDocument();
    expect(screen.getByText(/Family Mode Share Card Security/i)).toBeInTheDocument();
    expect(screen.getByText(/Never 100% Safe/i)).toBeInTheDocument();
    expect(screen.getByText(/1930/)).toBeInTheDocument();
  });

  it("toggles content to Hindi with Devanagari explanations", async () => {
    const user = userEvent.setup();
    render(<PrivacyModal isOpen={true} onClose={vi.fn()} />);

    const hindiBtn = screen.getByRole("button", { name: "हिन्दी" });
    await user.click(hindiBtn);

    expect(screen.getByText(/गोपनीयता नीति एवं डेटा सुरक्षा/i)).toBeInTheDocument();
    expect(screen.getByText(/शून्य डेटा संग्रहण गारंटी/i)).toBeInTheDocument();
    expect(screen.getByText(/स्क्रीनशॉट OCR सुरक्षा/i)).toBeInTheDocument();
    expect(screen.getByText(/फैमिली मोड शेयर कार्ड गोपनीयता/i)).toBeInTheDocument();
    expect(screen.getByText(/1930 राष्ट्रीय साइबर हेल्पलाइन/i)).toBeInTheDocument();
  });

  it("closes modal on Escape key press", () => {
    const onClose = vi.fn();
    render(<PrivacyModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes modal on Close button click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PrivacyModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText("Close");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens privacy modal when clicking link in App footer", async () => {
    const user = userEvent.setup();
    render(<App />);

    const footerPrivacyLink = screen.getByRole("button", {
      name: /Privacy Policy & Guarantees/i,
    });
    await user.click(footerPrivacyLink);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Zero Persistent Storage Guarantee/i)).toBeInTheDocument();
  });

  it("opens privacy modal when clicking link near input in HomePage", async () => {
    const user = userEvent.setup();
    render(<App />);

    const inputPrivacyLink = screen.getByRole("button", {
      name: /Privacy details/i,
    });
    await user.click(inputPrivacyLink);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Zero Persistent Storage Guarantee/i)).toBeInTheDocument();
  });
});
