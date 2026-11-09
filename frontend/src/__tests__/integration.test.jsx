import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomePage } from "../pages/HomePage";
import * as api from "../lib/api";
import { mockScamResponse, mockSafeResponse } from "./fixtures";

describe("HomePage Integration Flows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("populates message input when clicking a sample message button", async () => {
    render(<HomePage />);

    const sampleButton = screen.getByRole("button", { name: /Fake KYC Threat/i });
    fireEvent.click(sampleButton);

    const textarea = screen.getByRole("textbox", { name: /Paste suspicious message/i });
    expect(textarea.value).toContain("URGENT: Your SBI bank account will be suspended");

    // Check button should now be enabled
    const checkButton = screen.getByRole("button", { name: /Check Message/i });
    expect(checkButton).toBeEnabled();
  });

  it("handles complete successful analysis flow", async () => {
    const user = userEvent.setup();
    const analyzeSpy = vi.spyOn(api, "analyzeMessage").mockResolvedValue(mockScamResponse);

    render(<HomePage />);

    const textarea = screen.getByRole("textbox", { name: /Paste suspicious message/i });
    await user.type(textarea, "URGENT: SBI account blocked.");

    const checkButton = screen.getByRole("button", { name: /Check Message/i });
    await user.click(checkButton);

    expect(analyzeSpy).toHaveBeenCalledTimes(1);

    // Results should appear
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Verdict: Likely Scam/i })).toBeInTheDocument();
    });

    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call 1930/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cybercrime\.gov\.in/i })).toBeInTheDocument();
  });

  it("handles loading state and prevents double submission while loading", async () => {
    const user = userEvent.setup();
    let resolveAnalysis;
    const promise = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });

    const analyzeSpy = vi.spyOn(api, "analyzeMessage").mockReturnValue(promise);

    render(<HomePage />);

    const textarea = screen.getByRole("textbox", { name: /Paste suspicious message/i });
    await user.type(textarea, "Test message for double submit.");

    const checkButton = screen.getByRole("button", { name: /Check Message/i });
    await user.click(checkButton);

    // Verify loading state is displayed
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(checkButton).toBeDisabled();

    // Attempt second click while still loading
    await user.click(checkButton);
    expect(analyzeSpy).toHaveBeenCalledTimes(1);

    // Resolve promise
    resolveAnalysis(mockSafeResponse);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
      expect(screen.getByRole("region", { name: /Verdict: Safe/i })).toBeInTheDocument();
    });
  });

  it("handles API error state and allows retry", async () => {
    const user = userEvent.setup();
    const analyzeSpy = vi
      .spyOn(api, "analyzeMessage")
      .mockRejectedValueOnce(new api.ApiError("Backend is unreachable", 0, "NETWORK_ERROR"))
      .mockResolvedValueOnce(mockSafeResponse);

    render(<HomePage />);

    const textarea = screen.getByRole("textbox", { name: /Paste suspicious message/i });
    await user.type(textarea, "Some test text.");

    const checkButton = screen.getByRole("button", { name: /Check Message/i });
    await user.click(checkButton);

    // Error state appears
    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });
    const errorState = screen.getByTestId("error-state");
    expect(within(errorState).getByText(/Backend is unreachable/i)).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByRole("button", { name: /Retry Analysis/i });
    await user.click(retryButton);

    expect(analyzeSpy).toHaveBeenCalledTimes(2);

    // Resolves to safe verdict
    await waitFor(() => {
      expect(screen.queryByTestId("error-state")).toBeNull();
      expect(screen.getByRole("region", { name: /Verdict: Safe/i })).toBeInTheDocument();
    });
  });

  it("guarantees zero writes to localStorage or sessionStorage (strict privacy rule)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "analyzeMessage").mockResolvedValue(mockScamResponse);

    const localSetItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<HomePage />);

    // 1. Click sample
    const sampleButton = screen.getByRole("button", { name: /Fake KYC Threat/i });
    await user.click(sampleButton);

    // 2. Submit analysis
    const checkButton = screen.getByRole("button", { name: /Check Message/i });
    await user.click(checkButton);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Verdict: Likely Scam/i })).toBeInTheDocument();
    });

    // 3. Toggle language
    const hindiButton = screen.getByRole("button", { name: /हिन्दी/i });
    await user.click(hindiButton);

    // 4. Toggle action checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    // 5. Clear
    const clearButton = screen.getByRole("button", { name: /Clear/i });
    await user.click(clearButton);

    // Zero writes must have occurred
    expect(localSetItemSpy).not.toHaveBeenCalled();
  });
});
