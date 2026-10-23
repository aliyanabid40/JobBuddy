/**
 * @file lib/logo/letter-avatar.ts
 * Client-safe logo helpers: shared types + deterministic letter avatar styling.
 *
 * This module intentionally has NO Node.js imports so it can be bundled into
 * client components (the server-only resolution logic lives in `./resolveLogo`).
 */

/** Where a company logo finally came from. */
export type LogoSource =
  | "source_api"
  | "website"
  | "logo_api"
  | "favicon"
  | "letter_avatar";

/** One candidate image URL that was attempted during resolution. */
export interface LogoAttempt {
  url: string;
  status: number | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  bytes: number;
  hash: string;
  accepted: boolean;
  reason: string;
}

/** Final outcome of resolving a logo for one company. */
export interface ResolvedLogoResult {
  company: string;
  domain: string | null;
  logoUrl: string | null;
  source: LogoSource;
  width: number | null;
  height: number | null;
  attempts: LogoAttempt[];
}

/**
 * Deterministic letter-avatar palette.
 * Neutral + brand friendly hues only (slate, blue, amber, rose, violet, lime).
 * Each entry is a soft pastel background with a darker text color of the same hue.
 */
const AVATAR_PALETTES = [
  { bg: "#f1f5f9", color: "#334155", border: "#e2e8f0" }, // slate
  { bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" }, // blue
  { bg: "#fffbeb", color: "#b45309", border: "#fde68a" }, // amber
  { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" }, // rose
  { bg: "#f5f3ff", color: "#6d28d9", border: "#ede9fe" }, // violet
  { bg: "#f7fee7", color: "#4d7c0f", border: "#d9f99d" }, // lime (brand)
] as const;

/** Stable 32-bit hash of a company name (same name always maps to same color). */
export function hashCompanyName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // keep it a 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Letter avatar background/text/border colors, chosen deterministically
 * from a hash of the company name.
 */
export function getLetterAvatarStyles(companyName: string): {
  bg: string;
  color: string;
  border: string;
} {
  const name = (companyName || "").trim() || "Company";
  const index = hashCompanyName(name) % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[index];
  return { bg: palette.bg, color: palette.color, border: palette.border };
}

/**
 * First alphanumeric character of the company name, uppercased.
 * Falls back to "?" when the name has no usable character.
 */
export function getAvatarLetter(companyName: string): string {
  const name = (companyName || "").trim();
  const match = name.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}
