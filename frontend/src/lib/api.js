/**
 * API client for Scam Shield backend.
 * Reads the backend URL from the VITE_API_URL environment variable.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Check if the backend is reachable.
 * @returns {Promise<{status: string}>}
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}
