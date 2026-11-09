/**
 * Centralized bilingual strings for Scam Shield UI and Family Mode share cards.
 * @module lib/strings
 */

export const STRINGS = {
  appName: {
    en: "Scam Shield",
    hi: "स्कैम शील्ड",
  },
  tagline: {
    en: "Detect scam messages · Protect your family",
    hi: "संदिग्ध संदेश जांचें · अपने परिवार को सुरक्षित रखें",
  },
  verdicts: {
    likely_scam: {
      en: "Likely Scam",
      hi: "संभावित घोटाला",
      badgeClass: "bg-rose-600 text-white",
      themeColor: "#e11d48", // rose-600
      accentBg: "#4c0519", // rose-950
      borderColor: "#f43f5e", // rose-500
      textColor: "#fecdd3", // rose-200
    },
    suspicious: {
      en: "Suspicious",
      hi: "संदिग्ध",
      badgeClass: "bg-amber-600 text-white",
      themeColor: "#d97706", // amber-600
      accentBg: "#451a03", // amber-950
      borderColor: "#f59e0b", // amber-500
      textColor: "#fef3c7", // amber-200
    },
    safe: {
      en: "Safe",
      hi: "सुरक्षित",
      badgeClass: "bg-emerald-600 text-white",
      themeColor: "#059669", // emerald-600
      accentBg: "#022c22", // emerald-950
      borderColor: "#10b981", // emerald-500
      textColor: "#a7f3d0", // emerald-200
    },
  },
  scamTypes: {
    digital_arrest: {
      en: "Digital Arrest Fraud",
      hi: "डिजिटल अरेस्ट फ्रॉड (फर्जी पुलिस/CBI कॉल)",
    },
    fake_kyc: {
      en: "Fake KYC Deactivation Threat",
      hi: "फर्जी केवाईसी खाता बंद करने की धमकी",
    },
    upi_refund: {
      en: "UPI / Refund Reversal Scam",
      hi: "यूपीआई / गलत रिफंड का झांसा",
    },
    job_task_scam: {
      en: "Part-Time Job / Task Scam",
      hi: "घर बैठे नौकरी / पार्ट-टाइम टास्क फ्रॉड",
    },
    lottery_prize: {
      en: "Lottery / Prize Impersonation",
      hi: "फर्जी लॉटरी / इनाम का लालच",
    },
    electricity_bill_threat: {
      en: "Electricity Bill Disconnection Threat",
      hi: "बिजली बिल काटने की फर्जी धमकी",
    },
    other: {
      en: "Suspicious Fraud Pattern",
      hi: "संदिग्ध वित्तीय धोखाधड़ी",
    },
    none: {
      en: "Standard Message (No Scam Detected)",
      hi: "सामान्य संदेश (कोई घोटाला नहीं मिला)",
    },
  },
  headings: {
    keyWarningSigns: {
      en: "Key Warning Signs",
      hi: "मुख्य चेतावनी संकेत",
    },
    whatToDoNow: {
      en: "What To Do Now",
      hi: "अब क्या करें (सुरक्षा कदम)",
    },
    disclaimerTitle: {
      en: "Safety Notice",
      hi: "सुरक्षा सूचना",
    },
    forwardFamily: {
      en: "Forward this card to alert family and friends.",
      hi: "अपने परिवार और दोस्तों को सतर्क करने के लिए यह कार्ड भेजें।",
    },
  },
  disclaimers: {
    safe: {
      en: "No red flag found, but never share OTP, PIN or money with anyone who contacts you.",
      hi: "कोई जोखिम संकेतक नहीं मिला, लेकिन किसी के भी साथ OTP, PIN या पैसे कभी साझा न करें।",
    },
    suspicious: {
      en: "Suspicious indicators detected. Exercise extreme caution; never share OTP, PIN, passwords, or transfer funds without independent verification.",
      hi: "संदिग्ध संकेतक मिले हैं। अत्यधिक सतर्क रहें; बिना पुष्टि के किसी को भी OTP, पासवर्ड या पैसे न भेजें।",
    },
    likely_scam: {
      en: "High-risk scam indicators detected! Do not click any links, do not send money, and report immediately to 1930 or cybercrime.gov.in.",
      hi: "अत्यधिक जोखिम वाला घोटाला! किसी लिंक पर क्लिक न करें, पैसे न भेजें और तुरंत 1930 पर कॉल करें।",
    },
  },
  mandatorySteps: [
    {
      id: "MANDATORY-1930",
      text_en: "If money was lost or deducted, call 1930 helpline immediately.",
      text_hi: "यदि पैसे कट गए हैं, तो तुरंत 1930 साइबर हेल्पलाइन पर कॉल करें।",
      phone: "1930",
    },
    {
      id: "MANDATORY-CYBERCRIME",
      text_en: "Report this fraud incident at cybercrime.gov.in.",
      text_hi: "cybercrime.gov.in पोर्टल पर घटना की शिकायत दर्ज करें।",
      link: "https://cybercrime.gov.in",
    },
  ],
  labels: {
    shareWithFamily: {
      en: "Share with family",
      hi: "परिवार के साथ साझा करें",
    },
    downloadPng: {
      en: "Download Card (PNG)",
      hi: "कार्ड डाउनलोड करें (PNG)",
    },
    shareWhatsApp: {
      en: "Share on WhatsApp",
      hi: "व्हाट्सएप पर भेजें",
    },
    copyText: {
      en: "Copy Summary Text",
      hi: "संदेश कॉपी करें",
    },
    copied: {
      en: "Copied!",
      hi: "कॉपी हो गया!",
    },
    shareNative: {
      en: "Share Image",
      hi: "कार्ड साझा करें",
    },
    close: {
      en: "Close",
      hi: "बंद करें",
    },
  },
};

