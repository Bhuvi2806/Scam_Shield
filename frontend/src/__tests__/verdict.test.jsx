import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VerdictCard } from "../components/VerdictCard";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { ActionChecklist } from "../components/ActionChecklist";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { RedFlagList } from "../components/RedFlagList";
import { mockScamResponse } from "./fixtures";

describe("VerdictCard", () => {
  it("renders Likely Scam verdict with label, icon, score, and confidence level", () => {
    const { container } = render(
      <VerdictCard
        verdict="likely_scam"
        score={88}
        confidence={0.94}
        scamType="fake_kyc"
      />
    );

    // Text label
    expect(screen.getByText(/Likely Scam/i)).toBeInTheDocument();
    expect(screen.getByText(/संभावित घोटाला/i)).toBeInTheDocument();
    expect(screen.getByText(/Fake KYC Deactivation Threat/i)).toBeInTheDocument();

    // Score
    expect(screen.getByText("88")).toBeInTheDocument();

    // Confidence Level
    expect(screen.getByText(/High Confidence/i)).toBeInTheDocument();

    // Icon (SVG present)
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Suspicious verdict with warning label, icon, and moderate confidence", () => {
    render(
      <VerdictCard
        verdict="suspicious"
        score={48}
        confidence={0.72}
        scamType="job_task_scam"
      />
    );

    expect(screen.getByText(/Suspicious/i)).toBeInTheDocument();
    expect(screen.getByText(/संदिग्ध/i)).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText(/Moderate Confidence/i)).toBeInTheDocument();
  });

  it("renders Safe verdict with shield check, label, and safe styling", () => {
    render(
      <VerdictCard
        verdict="safe"
        score={5}
        confidence={0.90}
        scamType="none"
      />
    );

    expect(screen.getByText(/Safe/i)).toBeInTheDocument();
    expect(screen.getByText(/सुरक्षित/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

describe("ExplanationPanel", () => {
  it("displays English explanation by default for English input and toggles to Hindi", () => {
    render(
      <ExplanationPanel
        explanationEn="This is the English explanation."
        explanationHi="यह हिंदी व्याख्या है।"
        originalText="Hello, your account is suspended."
      />
    );

    // English visible by default
    expect(screen.getByText("This is the English explanation.")).toBeInTheDocument();
    expect(screen.queryByText("यह हिंदी व्याख्या है।")).toBeNull();

    // Click Hindi toggle button
    const hindiButton = screen.getByRole("button", { name: /हिन्दी/i });
    fireEvent.click(hindiButton);

    // Hindi visible now
    expect(screen.getByText("यह हिंदी व्याख्या है।")).toBeInTheDocument();
    expect(screen.queryByText("This is the English explanation.")).toBeNull();
  });

  it("defaults to Hindi explanation when original input text contains Devanagari script", () => {
    render(
      <ExplanationPanel
        explanationEn="English text."
        explanationHi="हिंदी पाठ।"
        originalText="नमस्ते, आपका खाता बंद हो गया है।"
      />
    );

    // Hindi should be default
    expect(screen.getByText("हिंदी पाठ।")).toBeInTheDocument();
    expect(screen.queryByText("English text.")).toBeNull();
  });
});

describe("ActionChecklist", () => {
  it("always contains tap-to-call 1930 and cybercrime.gov.in external link", () => {
    render(<ActionChecklist actions={mockScamResponse.verdict.actions} />);

    // 1930 tap-to-call link
    const phoneLink = screen.getByRole("link", { name: /Call 1930/i });
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink).toHaveAttribute("href", "tel:1930");

    // cybercrime.gov.in link with rel="noopener noreferrer"
    const cybercrimeLink = screen.getByRole("link", { name: /cybercrime\.gov\.in/i });
    expect(cybercrimeLink).toBeInTheDocument();
    expect(cybercrimeLink).toHaveAttribute("href", "https://cybercrime.gov.in");
    expect(cybercrimeLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(cybercrimeLink).toHaveAttribute("target", "_blank");
  });

  it("allows checking off action items interactively", () => {
    render(<ActionChecklist actions={mockScamResponse.verdict.actions} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();

    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });
});

describe("DisclaimerBanner", () => {
  it("renders disclaimer text and never outputs '100% safe'", () => {
    render(
      <DisclaimerBanner
        disclaimer="This message is 100% safe according to preliminary analysis."
        degraded={false}
      />
    );

    const banner = screen.getByTestId("verdict-disclaimer");
    expect(banner.textContent).not.toContain("100% safe");
    expect(banner.textContent).toContain("safe");
    expect(screen.queryByTestId("degraded-warning-banner")).toBeNull();
  });

  it("renders prominent degraded notice when degraded is true", () => {
    render(
      <DisclaimerBanner
        disclaimer="Standard disclaimer text."
        degraded={true}
      />
    );

    expect(screen.getByTestId("degraded-warning-banner")).toBeInTheDocument();
    expect(screen.getByText(/Limited Analysis Notice/i)).toBeInTheDocument();
  });
});

describe("RedFlagList", () => {
  it("renders list of red flags with categories, reasons, and source badges", () => {
    render(<RedFlagList redFlags={mockScamResponse.verdict.red_flags} />);

    expect(screen.getByText(/account blocked threat/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule Pattern/i)).toBeInTheDocument();
    expect(screen.getByText(/URL Heuristics/i)).toBeInTheDocument();
  });

  it("renders empty state notice when no flags are present", () => {
    render(<RedFlagList redFlags={[]} />);

    expect(screen.getByText(/No concrete scam indicators/i)).toBeInTheDocument();
  });
});
