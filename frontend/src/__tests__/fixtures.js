/**
 * Test fixtures representing API response contract from backend/app/schemas/verdict.py
 */

export const mockScamResponse = {
  verdict: {
    verdict: "likely_scam",
    score: 88,
    confidence: 0.94,
    scam_type: "fake_kyc",
    red_flags: [
      {
        category: "account blocked threat",
        quote: "account will be suspended today",
        start: 22,
        end: 53,
        reason: "Detected high-urgency threat of account suspension",
        source: "rule",
      },
      {
        category: "suspicious_link",
        quote: "hxxps://sbi-kyc-update[.]in",
        start: null,
        end: null,
        reason: "Deceptive domain mimicking official State Bank of India portal",
        source: "url_local",
      },
    ],
    explanation_en:
      "This message is a fake KYC scam. Banks never threaten immediate account suspension via SMS or request KYC completion through unofficial links.",
    explanation_hi:
      "यह संदेश एक फ़र्ज़ी KYC घोटाला है। बैंक कभी भी SMS द्वारा तुरंत खाता बंद करने की धमकी नहीं देते।",
    actions: [
      {
        id: "ACT-KYC-1",
        text_en: "Do not click the link or provide your banking credentials.",
        text_hi: "संदेश में दिए गए लिंक पर क्लिक न करें और न ही कोई विवरण भरें।",
        urgency: "immediate",
        link: null,
        phone: null,
      },
      {
        id: "ACT-1930",
        text_en: "If money was deducted, call the National Cyber Crime Helpline at 1930 immediately.",
        text_hi: "यदि पैसे कट गए हैं तो तुरंत 1930 हेल्पलाइन पर कॉल करें।",
        urgency: "immediate",
        link: null,
        phone: "1930",
      },
      {
        id: "ACT-CYBERCRIME",
        text_en: "Report this fraudulent message at cybercrime.gov.in.",
        text_hi: "इस धोखाधड़ी की शिकायत cybercrime.gov.in पर दर्ज करें।",
        urgency: "important",
        link: "https://cybercrime.gov.in",
        phone: null,
      },
    ],
    disclaimer:
      "High-risk scam indicators detected! Do not click any links, do not send money, and report immediately to 1930 or cybercrime.gov.in.",
    sources_used: ["rule", "llm", "url_check"],
    degraded: false,
  },
  layers: {
    rule: { score: 65, verdict: "likely_scam" },
    llm: { score: 85, verdict: "likely_scam" },
    url_check: { overall_status: "suspicious" },
    llm_error: null,
  },
};

export const mockSafeResponse = {
  verdict: {
    verdict: "safe",
    score: 8,
    confidence: 0.92,
    scam_type: "none",
    red_flags: [],
    explanation_en:
      "No scam patterns or malicious indicators were found in this message. It matches standard transactional alert formatting.",
    explanation_hi:
      "इस संदेश में कोई घोटाला या जोखिम संकेतक नहीं मिला। यह सामान्य बैंकिंग सूचना प्रतीत होती है।",
    actions: [
      {
        id: "ACT-1930",
        text_en: "In case of suspicious deductions, call 1930.",
        text_hi: "संदिग्ध कटौती की स्थिति में 1930 पर संपर्क करें।",
        urgency: "info",
        link: null,
        phone: "1930",
      },
      {
        id: "ACT-CYBERCRIME",
        text_en: "Report cyber fraud at cybercrime.gov.in.",
        text_hi: "साइबर अपराध की शिकायत cybercrime.gov.in पर करें।",
        urgency: "info",
        link: "https://cybercrime.gov.in",
        phone: null,
      },
    ],
    disclaimer:
      "No red flag found, but never share OTP, PIN or money with anyone who contacts you.",
    sources_used: ["rule", "llm", "url_check"],
    degraded: false,
  },
  layers: {
    rule: { score: 5, verdict: "safe" },
    llm: { score: 10, verdict: "safe" },
    url_check: { overall_status: "clean" },
    llm_error: null,
  },
};

export const mockSuspiciousResponse = {
  verdict: {
    verdict: "suspicious",
    score: 48,
    confidence: 0.72,
    scam_type: "job_task_scam",
    red_flags: [
      {
        category: "unrealistic earnings",
        quote: "earn Rs 5000 daily",
        start: 10,
        end: 28,
        reason: "Promises unusually high returns for minimal work",
        source: "rule",
      },
    ],
    explanation_en:
      "This message exhibits suspicious indicators such as unrealistic income promises. Exercise caution.",
    explanation_hi:
      "इस संदेश में संदिग्ध संकेतक हैं जैसे अत्यधिक कमाई का वादा। सतर्क रहें।",
    actions: [
      {
        id: "ACT-1930",
        text_en: "Call 1930 helpline if you paid any registration fee.",
        text_hi: "यदि कोई शुल्क दिया है तो 1930 पर कॉल करें।",
        urgency: "important",
        link: null,
        phone: "1930",
      },
      {
        id: "ACT-CYBERCRIME",
        text_en: "Report at cybercrime.gov.in.",
        text_hi: "cybercrime.gov.in पर शिकायत दर्ज करें।",
        urgency: "important",
        link: "https://cybercrime.gov.in",
        phone: null,
      },
    ],
    disclaimer:
      "Suspicious indicators detected. Exercise extreme caution; never share OTP, PIN, passwords, or transfer funds without independent verification.",
    sources_used: ["rule", "llm"],
    degraded: false,
  },
  layers: {
    rule: { score: 45, verdict: "suspicious" },
    llm: { score: 50, verdict: "suspicious" },
    url_check: null,
    llm_error: null,
  },
};

export const mockDegradedResponse = {
  verdict: {
    verdict: "suspicious",
    score: 35,
    confidence: 0.55,
    scam_type: "none",
    red_flags: [],
    explanation_en:
      "Limited analysis performed due to external service unavailability. Exercise caution.",
    explanation_hi:
      "बाहरी सेवा अनुपलब्ध होने के कारण सीमित विश्लेषण किया गया।",
    actions: [
      {
        id: "ACT-1930",
        text_en: "Call 1930 in emergency.",
        text_hi: "आपातकाल में 1930 पर कॉल करें।",
        urgency: "important",
        link: null,
        phone: "1930",
      },
      {
        id: "ACT-CYBERCRIME",
        text_en: "Report at cybercrime.gov.in.",
        text_hi: "cybercrime.gov.in पर रिपोर्ट करें।",
        urgency: "important",
        link: "https://cybercrime.gov.in",
        phone: null,
      },
    ],
    disclaimer:
      "Suspicious indicators detected. Exercise extreme caution; never share OTP, PIN, passwords, or transfer funds without independent verification.",
    sources_used: ["rule"],
    degraded: true,
  },
  layers: {
    rule: { score: 10, verdict: "safe" },
    llm: null,
    url_check: null,
    llm_error: "Anthropic API timeout",
  },
};

export const mockOcrSuccessResponse = {
  text: "URGENT: Your SBI account has been suspended. Visit http://sbi-kyc.in to update immediately.",
  language_guess: "en",
  confidence: 0.88,
  low_confidence: false,
  warnings: [],
};

export const mockOcrLowConfidenceResponse = {
  text: "Aapka account block ho gaya hai.",
  language_guess: "hinglish",
  confidence: 0.42,
  low_confidence: true,
  warnings: ["Low OCR confidence score: 0.42"],
};


