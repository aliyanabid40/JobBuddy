/**
 * @file lib/jobs/match-score.ts
 * Computes a 0-100 match score between a normalized job and the user's profile.
 *
 * Scoring breakdown:
 *   Title/Role match   → up to 40 pts
 *   Skills/Tech match  → up to 40 pts (8 pts per matched skill, cap at 5)
 *   Location match     → up to 20 pts
 */

import type { RawNormalizedJob, UserProfileForJobs } from "./types";
import { matchesTitle, matchesLocation } from "./query-parser";

/** Exposed weight constants for testing */
export const SCORE_WEIGHTS = {
  TITLE: 40,
  SKILL_PER_MATCH: 8,
  MAX_SKILL_MATCHES: 5,
  LOCATION: 20,
} as const;

/**
 * Calculate match score (0–100) for a job vs a user profile.
 */
export function calculateMatchScore(
  job: Pick<RawNormalizedJob, "title" | "description" | "location">,
  profile: UserProfileForJobs
): number {
  const jobText = `${job.title} ${job.description}`.toLowerCase();

  let score = 0;

  // ── 1. Title/Role match ───────────────────────────────────────
  const userRole = (profile.role || profile.title || "").toLowerCase().trim();
  if (userRole && userRole.length > 0) {
    if (matchesTitle(job.title, userRole) || jobText.includes(userRole)) {
      score += SCORE_WEIGHTS.TITLE;
    } else {
      // Partial: match individual words from title (min 4 chars)
      const titleWords = userRole
        .split(/\s+/)
        .filter((w) => w.length >= 4);
      const matchedWords = titleWords.filter((w) => jobText.includes(w));
      if (matchedWords.length > 0) {
        score += Math.floor(
          (matchedWords.length / Math.max(titleWords.length, 1)) *
            SCORE_WEIGHTS.TITLE
        );
      }
    }
  }

  // ── 2. Skills & Tech Stack match ─────────────────────────────
  const allSkills = [
    ...(profile.skills || []),
    ...(profile.tech_stack || []),
  ];
  const matchedSkills = allSkills
    .filter((s) => s && s.trim().length > 1)
    .filter((s, idx, arr) => arr.indexOf(s) === idx) // unique
    .filter((s) => jobText.includes(s.toLowerCase().trim()));

  const effectiveMatches = Math.min(
    matchedSkills.length,
    SCORE_WEIGHTS.MAX_SKILL_MATCHES
  );
  score += effectiveMatches * SCORE_WEIGHTS.SKILL_PER_MATCH;

  // ── 3. Location match ────────────────────────────────────────
  const rawLoc = profile.preferred_location || profile.location || "";
  if (rawLoc && matchesLocation(job.location, rawLoc)) {
    score += SCORE_WEIGHTS.LOCATION;
  }

  return Math.min(score, 100);
}
