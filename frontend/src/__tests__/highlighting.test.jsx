import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HighlightedMessage } from "../components/HighlightedMessage";

describe("HighlightedMessage", () => {
  it("renders plain text without highlights when no red flags are passed", () => {
    const text = "Your account balance is INR 5,000. Have a nice day.";
    render(<HighlightedMessage text={text} redFlags={[]} />);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryAllByTestId("red-flag-highlight")).toHaveLength(0);
  });

  it("renders non-overlapping red flags with correct highlight spans", () => {
    const text = "URGENT: Your SBI account is blocked. Call immediately.";
    const redFlags = [
      {
        category: "urgency",
        quote: "URGENT:",
        start: 0,
        end: 7,
        reason: "Artificial urgency",
        source: "rule",
      },
      {
        category: "account blocked threat",
        quote: "blocked",
        start: 28,
        end: 35,
        reason: "Threat of blocked account",
        source: "rule",
      },
    ];

    render(<HighlightedMessage text={text} redFlags={redFlags} />);

    const highlights = screen.getAllByTestId("red-flag-highlight");
    expect(highlights).toHaveLength(2);
    expect(highlights[0]).toHaveTextContent("URGENT:");
    expect(highlights[1]).toHaveTextContent("blocked");
  });

  it("merges overlapping intervals into a single continuous highlight without text duplication", () => {
    const text = "Your account has been blocked immediately due to non-compliance.";
    const start1 = text.indexOf("blocked");
    const end1 = text.indexOf("immediately") + "immediately".length;
    const start2 = text.indexOf("immediately");
    const end2 = text.indexOf("due to") + "due to".length;

    const redFlags = [
      {
        category: "threat",
        start: start1,
        end: end1,
        reason: "Threat",
        source: "rule",
      },
      {
        category: "urgency",
        start: start2,
        end: end2,
        reason: "Urgency",
        source: "rule",
      },
    ];

    render(<HighlightedMessage text={text} redFlags={redFlags} />);

    // Should merge into one continuous highlight: "blocked immediately due to"
    const highlights = screen.getAllByTestId("red-flag-highlight");
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toHaveTextContent("blocked immediately due to");
  });

  it("locates and highlights quote-only flags when offsets are absent", () => {
    const text = "Dear user, claim your lottery prize now at sbi-lottery.xyz";
    const redFlags = [
      {
        category: "lottery_claim",
        quote: "lottery prize",
        start: null,
        end: null,
        reason: "Lottery claim promise",
        source: "llm",
      },
    ];

    render(<HighlightedMessage text={text} redFlags={redFlags} />);

    const highlights = screen.getAllByTestId("red-flag-highlight");
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toHaveTextContent("lottery prize");
  });

  it("safely handles out-of-range offsets without crashing", () => {
    const text = "Short text.";
    const redFlags = [
      {
        category: "invalid_negative",
        start: -5,
        end: 5,
        reason: "Negative start",
        source: "rule",
      },
      {
        category: "invalid_overflow",
        start: 50,
        end: 100,
        reason: "Beyond text length",
        source: "rule",
      },
      {
        category: "invalid_inverted",
        start: 8,
        end: 2,
        reason: "Start greater than end",
        source: "rule",
      },
      {
        category: "nonexistent_quote",
        quote: "phrase that is nowhere in the text",
        start: null,
        end: null,
        reason: "Not found",
        source: "llm",
      },
    ];

    // Rendering must not crash
    expect(() => {
      render(<HighlightedMessage text={text} redFlags={redFlags} />);
    }).not.toThrow();

    expect(screen.getByText("Short text.")).toBeInTheDocument();
    expect(screen.queryAllByTestId("red-flag-highlight")).toHaveLength(0);
  });

  it("renders raw HTML in the message strictly as plain text (XSS defense)", () => {
    const maliciousPayload = '<script>alert("pwned")</script><img src="x" onerror="evil()"/>';
    const redFlags = [
      {
        category: "suspicious_code",
        quote: 'alert("pwned")',
        start: null,
        end: null,
        reason: "Injection test",
        source: "llm",
      },
    ];

    const { container } = render(
      <HighlightedMessage text={maliciousPayload} redFlags={redFlags} />
    );

    // Verify no script or img elements were injected into the DOM
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();

    // Verify the raw text content is present verbatim
    expect(container.textContent).toContain('<script>');
    expect(container.textContent).toContain('<img src="x"');
  });
});
