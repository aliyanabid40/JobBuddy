import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];

  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }

  if (process.env.GEMINI_API_KEY_SECONDARY) {
    keys.push(process.env.GEMINI_API_KEY_SECONDARY.trim());
  }

  // Also support comma-separated GEMINI_API_KEYS if provided
  if (process.env.GEMINI_API_KEYS) {
    const split = process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean);
    keys.push(...split);
  }

  const unique = Array.from(new Set(keys)).filter(Boolean);
  if (unique.length === 0) {
    throw new Error(
      "No GEMINI_API_KEY configured in environment variables. Please add GEMINI_API_KEY to your .env.local file."
    );
  }

  return unique;
}

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
}

/**
 * Returns prioritized list of Gemini model candidates for automatic failover.
 * Prioritizes high-speed, active models (gemini-3.5-flash-lite, gemini-3.5-flash, gemini-3.8-flash)
 * and excludes deprecated models like 2.5-flash which fail with 404.
 */
export function getGeminiCandidateModels(): string[] {
  const configured = getGeminiModelName();
  const list = [
    configured,
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
  ];
  return Array.from(new Set(list));
}
