import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QRResultCard } from "../components/QRResultCard";

describe("QRResultCard Component", () => {
  it("renders null when qrResult is null or not found", () => {
    const { container: c1 } = render(<QRResultCard qrResult={null} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <QRResultCard qrResult={{ found: false, qr_type: "none", verdict: "safe", score: 0 }} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it("renders UPI scam alert with payee details and golden rule", () => {
    const qrScamData = {
      found: true,
      qr_type: "upi",
      verdict: "likely_scam",
      score: 90,
      safety_rule_en:
        "In India's UPI system, scanning a QR code or entering your UPI PIN is ONLY for SENDING money. You NEVER need to scan a QR code or enter a PIN to receive money.",
      safety_rule_hi:
        "भारत के UPI सिस्टम में, QR कोड स्कैन करना या UPI PIN डालना केवल पैसे भेजने के लिए होता है।",
      upi_payload: {
        payee_vpa: "refund.trap@ybl",
        payee_name: "PhonePe Refund Desk",
        amount: 4500,
        currency: "INR",
        transaction_note: "Claim your instant cashback",
        is_valid_vpa: true,
      },
      red_flags: [
        {
          category: "UPI Scan-to-Receive Trap",
          reason: "Deceptive 'Refund / Cashback' note in debit QR code.",
          severity: "critical",
        },
      ],
    };

    render(<QRResultCard qrResult={qrScamData} />);

    expect(screen.getByTestId("qr-result-card")).toBeInTheDocument();
    expect(screen.getByText(/High-Risk QR Scam/i)).toBeInTheDocument();
    expect(screen.getByText("refund.trap@ybl")).toBeInTheDocument();
    expect(screen.getByText("PhonePe Refund Desk")).toBeInTheDocument();
    expect(screen.getByText(/₹4,500.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Claim your instant cashback/i)).toBeInTheDocument();

    // Check golden rule
    expect(screen.getByText(/Golden Rule of UPI/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ONLY for SENDING money/i)
    ).toBeInTheDocument();

    // Check red flag
    expect(screen.getByText(/UPI Scan-to-Receive Trap:/i)).toBeInTheDocument();
  });

  it("calls onDismiss when close button is clicked", () => {
    const onDismiss = vi.fn();
    const qrData = {
      found: true,
      qr_type: "upi",
      verdict: "suspicious",
      score: 50,
      upi_payload: {
        payee_vpa: "seller@paytm",
        payee_name: "Local Shop",
        amount: null,
      },
      red_flags: [],
      safety_rule_en: "UPI rule",
      safety_rule_hi: "UPI नियम",
    };

    render(<QRResultCard qrResult={qrData} onDismiss={onDismiss} />);

    const closeBtn = screen.getByLabelText("Dismiss QR alert");
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

