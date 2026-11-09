/**
 * Helper to capture DOM element as PNG image in the browser
 * and handle Web Share / Download / WhatsApp sharing.
 *
 * PRIVACY GUARANTEES:
 * - All image processing occurs strictly in memory on the client.
 * - Zero network requests, zero storage writes, zero telemetry.
 * - Object URLs are explicitly revoked.
 *
 * @module lib/shareCard
 */

import { toBlob } from "html-to-image";

/**
 * Capture a DOM element into a PNG Blob.
 * Awaits document.fonts.ready so Devanagari and English fonts are fully rendered.
 *
 * @param {HTMLElement} node DOM element to capture
 * @returns {Promise<Blob>}
 */
export async function captureCardAsBlob(node) {
  if (!node) {
    throw new Error("No DOM element provided for capture.");
  }

  // Ensure all bundled fonts are fully loaded before capturing
  if (document?.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-fatal if font loading check fails
    }
  }

  const blob = await toBlob(node, {
    quality: 0.95,
    pixelRatio: 2, // 2x crispness for high-res displays and WhatsApp
    skipFonts: false,
    backgroundColor: "#0f172a",
  });

  if (!blob) {
    throw new Error("Failed to generate image from card.");
  }

  return blob;
}

/**
 * Capture DOM element and convert to a File object for Web Share API.
 *
 * @param {HTMLElement} node
 * @param {string} [fileName="scam-shield-alert.png"]
 * @returns {Promise<File>}
 */
export async function captureCardAsFile(node, fileName = "scam-shield-alert.png") {
  const blob = await captureCardAsBlob(node);
  return new File([blob], fileName, { type: "image/png" });
}

/**
 * Trigger native browser file download for a Blob.
 * Creates an object URL and automatically cleans it up.
 *
 * @param {Blob} blob
 * @param {string} [fileName="scam-shield-alert.png"]
 */
export function triggerBlobDownload(blob, fileName = "scam-shield-alert.png") {
  if (!blob) return;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke object URL after click
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

/**
 * Check if the browser supports sharing image files via Web Share API.
 *
 * @param {File} [testFile]
 * @returns {boolean}
 */
export function canShareFiles(testFile) {
  try {
    if (!navigator?.share || !navigator?.canShare) {
      return false;
    }
    const file = testFile || new File(["dummy"], "test.png", { type: "image/png" });
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Generate a WhatsApp web / deep link for sharing text.
 *
 * @param {string} text Plain text summary to pre-fill
 * @returns {string} WhatsApp URL
 */
export function getWhatsAppShareUrl(text) {
  const encoded = encodeURIComponent(text || "");
  return `https://wa.me/?text=${encoded}`;
}
