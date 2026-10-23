/**
 * @file lib/jobs/query-builder.ts
 * Builds platform-specific Tavily search queries from user profile data.
 *
 * Exact platform patterns:
 *  - Greenhouse: "site:job-boards.greenhouse.io OR site:boards.greenhouse.io {jobTitle} {location}" (site:greenhouse.io)
 *  - Lever:      "site:jobs.lever.co {jobTitle} {location}" (site:lever.co)
 *  - Workable:   "site:apply.workable.com {jobTitle} {location}" (site:workable.com)
 *  - Wellfound:  "site:wellfound.com/jobs {jobTitle} {location}" (site:wellfound.com)
 */

import type { UserProfileForJobs, Platform } from "./types";

export const ALL_PLATFORMS: Platform[] = [
  "greenhouse",
  "lever",
  "workable",
  "wellfound",
];

export const PLATFORM_SITE_FILTERS: Record<Platform, string> = {
  greenhouse: "site:job-boards.greenhouse.io OR site:boards.greenhouse.io",
  lever: "site:jobs.lever.co",
  workable: "site:apply.workable.com",
  wellfound: "site:wellfound.com/jobs",
};

/**
 * Build search query per platform.
 * If location is empty or "Remote", omit it or keep cleanly formatted.
 */
export function buildPlatformQuery(
  profile: UserProfileForJobs,
  platform: Platform
): string {
  const jobTitle = (profile.role || profile.title || "Software Engineer").trim();
  const rawLoc = (profile.preferred_location || profile.location || "").trim();

  // If location is empty or generic remote, omit location to ensure high yield
  const location =
    rawLoc && rawLoc.toLowerCase() !== "remote" ? rawLoc.split(",")[0]?.trim() : "";

  const prefix = PLATFORM_SITE_FILTERS[platform];
  return location
    ? `${prefix} ${jobTitle} ${location}`.trim()
    : `${prefix} ${jobTitle}`.trim();
}

/**
 * Build broader search query (without location) for fallback when primary query yields 0 results.
 */
export function buildBroaderPlatformQuery(
  profile: UserProfileForJobs,
  platform: Platform
): string {
  const jobTitle = (profile.role || profile.title || "Software Engineer").trim();
  return `${PLATFORM_SITE_FILTERS[platform]} ${jobTitle}`.trim();
}

/**
 * Build queries for ALL platforms.
 */
export function buildAllPlatformQueries(
  profile: UserProfileForJobs
): Record<Platform, string> {
  return Object.fromEntries(
    ALL_PLATFORMS.map((p) => [p, buildPlatformQuery(profile, p)])
  ) as Record<Platform, string>;
}
