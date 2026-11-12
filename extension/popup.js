/**
 * Scam Shield Popup Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_API_URL = "http://localhost:8000";
  const apiUrlInput = document.getElementById("api-url-input");
  const saveBtn = document.getElementById("save-settings-btn");
  const checkBtn = document.getElementById("quick-check-btn");
  const textArea = document.getElementById("quick-text");
  const resultBox = document.getElementById("quick-result");

  // Load saved API URL
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(["apiUrl"], (items) => {
      if (items.apiUrl) {
        apiUrlInput.value = items.apiUrl;
      }
    });
  }

  // Save API URL
  saveBtn.addEventListener("click", () => {
    const newUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ apiUrl: newUrl }, () => {
        saveBtn.innerText = "Saved!";
        setTimeout(() => {
          saveBtn.innerText = "Save Settings";
        }, 1500);
      });
    }
  });

  // Quick message analysis
  checkBtn.addEventListener("click", async () => {
    const text = textArea.value.trim();
    if (!text) {
      alert("Please paste a message first.");
      return;
    }

    const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
    checkBtn.disabled = true;
    checkBtn.innerText = "Analyzing...";
    resultBox.style.display = "none";

    try {
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const verdict = data.verdict;
      const color =
        verdict.verdict === "likely_scam"
          ? "#f87171"
          : verdict.verdict === "suspicious"
          ? "#fbbf24"
          : "#34d399";

      resultBox.innerHTML = `
        <div style="font-weight: 800; color: ${color}; text-transform: uppercase; margin-bottom: 4px;">
          Verdict: ${verdict.verdict.replace(/_/g, " ")} (${verdict.score}/100)
        </div>
        <div style="font-size: 11.5px; color: #cbd5e1; margin-bottom: 6px;">
          ${verdict.explanation_en}
        </div>
        <div style="font-size: 11px; color: #94a3b8;">
          ${verdict.explanation_hi}
        </div>
      `;
      resultBox.style.display = "block";
    } catch (err) {
      resultBox.innerHTML = `
        <div style="color: #f87171; font-weight: bold;">
          Connection Error: ${err.message}
        </div>
        <div style="font-size: 10.5px; color: #94a3b8; margin-top: 4px;">
          Ensure Scam Shield backend is running on ${apiUrl}.
        </div>
      `;
      resultBox.style.display = "block";
    } finally {
      checkBtn.disabled = false;
      checkBtn.innerText = "Check Message";
    }
  });
});
