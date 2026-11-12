/**
 * Scam Shield Content Script for WhatsApp Web
 * Injects non-intrusive [🛡️ Check] action buttons onto incoming messages.
 * Privacy-first: strictly zero background scraping; analyzes only the message clicked by user.
 */

(() => {
  const DEFAULT_API_URL = "http://localhost:8000";

  /**
   * Fetch backend API URL from Chrome extension storage.
   */
  async function getApiUrl() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(["apiUrl"], (items) => {
          resolve(items.apiUrl || DEFAULT_API_URL);
        });
      } else {
        resolve(DEFAULT_API_URL);
      }
    });
  }

  /**
   * Extract plain text content from a WhatsApp message element.
   */
  function extractMessageText(messageEl) {
    const textNode = messageEl.querySelector(".selectable-text, .copyable-text, span[dir='ltr']");
    if (textNode) {
      return textNode.innerText.trim();
    }
    return messageEl.innerText.trim();
  }

  /**
   * Display floating in-context Scam Shield verdict modal.
   */
  function showVerdictModal(data, originalText) {
    // Remove existing modal if any
    const existing = document.getElementById("scamshield-modal");
    if (existing) {
      existing.remove();
    }

    const verdict = data.verdict;
    const isScam = verdict.verdict === "likely_scam";
    const isSuspicious = verdict.verdict === "suspicious";

    const badgeClass = isScam
      ? "scamshield-likely-scam"
      : isSuspicious
      ? "scamshield-suspicious"
      : "scamshield-safe";

    const badgeIcon = isScam ? "🚨" : isSuspicious ? "⚠️" : "✅";
    const badgeText = isScam
      ? "Likely Scam / संभावित घोटाला"
      : isSuspicious
      ? "Suspicious / संदिग्ध संदेश"
      : "Safe / सुरक्षित";

    const overlay = document.createElement("div");
    overlay.id = "scamshield-modal";
    overlay.className = "scamshield-overlay";

    let flagsHtml = "";
    if (verdict.red_flags && verdict.red_flags.length > 0) {
      flagsHtml = `
        <div style="margin: 12px 0;">
          <strong style="font-size: 11px; text-transform: uppercase; color: #f87171; letter-spacing: 0.05em;">
            Red Flags Detected / खतरे के संकेत:
          </strong>
          <ul class="scamshield-flags-list">
            ${verdict.red_flags
              .slice(0, 3)
              .map(
                (f) => `
                <li class="scamshield-flag-item">
                  <span>🚩</span>
                  <div>
                    <strong>${f.category}:</strong> ${f.reason}
                  </div>
                </li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="scamshield-card" role="dialog" aria-modal="true">
        <div class="scamshield-card-header">
          <div class="scamshield-card-title">
            <span>🛡️</span>
            <span>Scam Shield &middot; WhatsApp Safety</span>
          </div>
          <button class="scamshield-close-btn" id="scamshield-modal-close" aria-label="Close">&times;</button>
        </div>

        <div>
          <span class="scamshield-badge ${badgeClass}">
            ${badgeIcon} ${badgeText}
          </span>
          ${
            verdict.scam_type
              ? `<div style="font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 8px;">Category: ${verdict.scam_type.replace(/_/g, " ")}</div>`
              : ""
          }
        </div>

        <div class="scamshield-explanation">
          <p style="margin: 0 0 8px 0; font-weight: 500;">${verdict.explanation_en}</p>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px;">${verdict.explanation_hi}</p>
        </div>

        ${flagsHtml}

        <div class="scamshield-actions-bar">
          <a href="tel:1930" class="scamshield-1930-btn">
            📞 Call 1930 (Helpline)
          </a>
          <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-size: 12px; text-decoration: underline;">
            cybercrime.gov.in &rarr;
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event handlers
    const closeBtn = document.getElementById("scamshield-modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => overlay.remove();
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
  }

  /**
   * Handle user clicking the [🛡️ Check] button on a WhatsApp message.
   */
  async function handleCheckClick(button, messageEl) {
    const text = extractMessageText(messageEl);
    if (!text || text.length < 5) {
      alert("No readable text found in this message bubble.");
      return;
    }

    const origHtml = button.innerHTML;
    button.innerHTML = "<span>⏳ Analyzing...</span>";
    button.classList.add("scamshield-loading");

    try {
      const apiUrl = await getApiUrl();
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      showVerdictModal(data, text);
    } catch (err) {
      alert(
        `Scam Shield Error: Could not connect to backend server (${err.message}). Ensure Scam Shield is running.`
      );
    } finally {
      button.innerHTML = origHtml;
      button.classList.remove("scamshield-loading");
    }
  }

  /**
   * Attach Scam Shield button to a WhatsApp message bubble.
   */
  function attachButtonToMessage(messageEl) {
    if (messageEl.dataset.scamshieldAttached) {
      return;
    }
    messageEl.dataset.scamshieldAttached = "true";

    const btnContainer = document.createElement("span");
    btnContainer.className = "scamshield-btn-container";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scamshield-check-btn";
    btn.innerHTML = "<span>🛡️ Check</span>";
    btn.title = "Analyze this message for scam patterns with Scam Shield";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleCheckClick(btn, messageEl);
    });

    btnContainer.appendChild(btn);

    // Try to find a footer or timestamp container, or append directly to message
    const metaContainer = messageEl.querySelector(
      "div[data-testid='msg-meta'], .copyable-text, span"
    );
    if (metaContainer && metaContainer.parentNode) {
      metaContainer.parentNode.insertBefore(btnContainer, metaContainer.nextSibling);
    } else {
      messageEl.appendChild(btnContainer);
    }
  }

  /**
   * Scan DOM for WhatsApp Web incoming messages and inject check buttons.
   */
  function scanMessages() {
    // Selectors covering WhatsApp Web incoming and outgoing message bubbles
    const messageElements = document.querySelectorAll(
      ".message-in, .message-out, div[data-testid='msg-container'], div[data-pre-plain-text]"
    );

    messageElements.forEach((el) => {
      attachButtonToMessage(el);
    });
  }

  // Initial scan and setup MutationObserver for live conversation scrolling
  scanMessages();

  const observer = new MutationObserver(() => {
    scanMessages();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("Scam Shield: WhatsApp Web protection initialized.");
})();
