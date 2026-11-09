import { describe, it, expect } from "vitest";
import {
  buildCardContent,
  buildShareText,
  defangUrl,
  MAX_CARD_FLAGS,
  MAX_CARD_STEPS,
} from "../lib/cardContent";
import { mockScamResponse, mockSafeResponse, mockDegradedResponse } from "./fixtures";

describe("cardContent Builder (Pure Functions)", () => {
  const canaryQuote = "CANARY_SECRET_OTP_987654_DO_NOT_LEAK";
  const canaryUrl = "https://phishing-site-canary.ru/steal";

  const fixtureWithSecrets = {
    verdict: "likely_scam",
    score: 95,
    confidence: 0.98,
    scam_type: "digital_arrest",
    red_flags: [
      {
        category: "police impersonation",
        quote: canaryQuote,
        start: 10,
        end: 45,
        reason: `Caller claiming to be CBI demanding money at ${canaryUrl}`,
        source: "rule",
      },
      {
        category: "stay on video call",
        quote: "remain on skype until verification complete",
        start: 46,
        end: 90,
        reason: "Coercing victim to remain on video call isolated from family",
        source: "llm",
      },
      {
        category: "immediate arrest threat",
        quote: "arrest warrant issued in 2 hours",
        start: 91,
        end: 125,
        reason: "Creating extreme panic through false legal threats",
        source: "rule",
      },
      {
        category: "fourth flag that should be capped",
        quote: "excessive flag quote",
        start: 130,
        end: 150,
        reason: "Excess flag reason",
        source: "rule",
      },
    ],
    explanation_en: "Digital arrest scam explanation.",
    explanation_hi: "डिजिटल अरेस्ट घोटाले का विवरण।",
    actions: [
      {
        id: "ACT-1",
        text_en: "Hang up immediately. Police never arrests people over video calls.",
        text_hi: "तुरंत फोन काट दें। पुलिस कभी भी वीडियो कॉल पर गिरफ्तारी नहीं करती।",
        urgency: "immediate",
      },
    ],
    disclaimer: "High-risk scam indicators detected!",
    sources_used: ["rule", "llm"],
    degraded: false,
  };

  it("caps red flags at MAX_CARD_FLAGS (3)", () => {
    const card = buildCardContent(fixtureWithSecrets, "en");
    expect(card.flags.length).toBeLessThanOrEqual(MAX_CARD_FLAGS);
    expect(card.flags.length).toBe(3);
  });

  it("caps action steps at MAX_CARD_STEPS (4) and always includes 1930 and cybercrime.gov.in", () => {
    const card = buildCardContent(fixtureWithSecrets, "en");
    expect(card.steps.length).toBeLessThanOrEqual(MAX_CARD_STEPS);

    const has1930 = card.steps.some(
      (s) => s.phone === "1930" || s.text.includes("1930")
    );
    expect(has1930).toBe(true);

    const hasCybercrime = card.steps.some((s) =>
      s.text.includes("cybercrime.gov.in")
    );
    expect(hasCybercrime).toBe(true);
  });

  it("strictly omits quote fields and defangs URLs in flag reasons", () => {
    const card = buildCardContent(fixtureWithSecrets, "en");
    const jsonStr = JSON.stringify(card);

    // Assert that the canary quote string NEVER appears anywhere in the card
    expect(jsonStr).not.toContain(canaryQuote);

    // Assert that raw http/https url was defanged
    expect(jsonStr).not.toContain("https://phishing-site-canary.ru/steal");
    expect(jsonStr).toContain("hxxps://phishing-site-canary[.]ru/steal");
  });

  it("guarantees safe verdict has exact lowest-risk disclaimer and never says '100% safe'", () => {
    const cardEn = buildCardContent(mockSafeResponse.verdict, "en");
    expect(cardEn.disclaimer).toBe(
      "No red flag found, but never share OTP, PIN or money with anyone who contacts you."
    );
    expect(JSON.stringify(cardEn)).not.toMatch(/100%\s*safe/i);

    const cardHi = buildCardContent(mockSafeResponse.verdict, "hi");
    expect(cardHi.disclaimer).toContain("कोई जोखिम संकेतक नहीं मिला");
    expect(JSON.stringify(cardHi)).not.toMatch(/100%\s*safe/i);
  });

  it("builds valid card from degraded verdict without crashing", () => {
    const card = buildCardContent(mockDegradedResponse.verdict, "en");
    expect(card.verdict).toBe("suspicious");
    expect(card.degraded).toBe(true);
    expect(card.steps.length).toBeGreaterThan(0);
    expect(card.flags.length).toBeGreaterThan(0);
  });

  it("builds bilingual card in Hindi with Devanagari labels", () => {
    const card = buildCardContent(mockScamResponse.verdict, "hi");
    expect(card.appName).toBe("स्कैम शील्ड");
    expect(card.verdictLabel).toBe("संभावित घोटाला");
    expect(card.scamTypeLabel).toContain("केवाईसी");
    expect(card.headings.keyWarningSigns).toBe("मुख्य चेतावनी संकेत");
    expect(card.headings.whatToDoNow).toContain("अब क्या करें");
  });

  it("buildShareText builds safe WhatsApp text with bold formatting and zero leaked quotes", () => {
    const shareText = buildShareText(fixtureWithSecrets, "en");
    expect(shareText).toContain("Scam Shield");
    expect(shareText).toContain("1930");
    expect(shareText).toContain("cybercrime.gov.in");
    expect(shareText).not.toContain(canaryQuote);
    expect(shareText).not.toMatch(/100%\s*safe/i);

    const shareTextHi = buildShareText(fixtureWithSecrets, "hi");
    expect(shareTextHi).toContain("स्कैम शील्ड");
    expect(shareTextHi).toContain("1930");
    expect(shareTextHi).not.toContain(canaryQuote);
  });

  it("defangUrl helper converts URLs correctly", () => {
    expect(defangUrl("https://example.com/test")).toBe("hxxps://example[.]com/test");
    expect(defangUrl("http://evil.in")).toBe("hxxp://evil[.]in");
    expect(defangUrl("")).toBe("");
    expect(defangUrl(null)).toBe("");
  });
});
