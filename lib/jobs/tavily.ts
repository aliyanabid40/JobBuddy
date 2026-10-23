/**
 * @file lib/jobs/tavily.ts
 * Tavily Search API client for job discovery.
 *
 * Implements exact search queries per platform:
 *  - Greenhouse: "site:job-boards.greenhouse.io OR site:boards.greenhouse.io {jobTitle} {location}"
 *  - Lever:      "site:jobs.lever.co {jobTitle} {location}"
 *  - Workable:   "site:apply.workable.com {jobTitle} {location}"
 *  - Wellfound:  "site:wellfound.com/jobs {jobTitle} {location}"
 *
 * Automatically falls back to broader query (without location) if 0 results returned.
 */

import { tavily } from "@tavily/core";
import type { Platform, SearchWebResult } from "./types";

export class TavilyApiError extends Error {
  constructor(message: string) {
    super(`Tavily API error: ${message}`);
    this.name = "TavilyApiError";
  }
}

/** Platform specific target domains for Tavily include_domains */
export const PLATFORM_DOMAINS: Record<Platform, string[]> = {
  greenhouse: ["job-boards.greenhouse.io", "boards.greenhouse.io"],
  lever: ["jobs.lever.co"],
  workable: ["apply.workable.com"],
  wellfound: ["wellfound.com"],
};

/**
 * Build primary and broader search query strings for a platform.
 */
export function buildPlatformQueries(
  platform: Platform,
  jobTitle: string,
  location?: string
): { primaryQuery: string; broaderQuery: string } {
  const cleanTitle = (jobTitle || "Software Engineer").trim();
  const cleanLoc = (location || "").trim();

  let sitePrefix = "";
  switch (platform) {
    case "greenhouse":
      sitePrefix = "site:job-boards.greenhouse.io OR site:boards.greenhouse.io";
      break;
    case "lever":
      sitePrefix = "site:jobs.lever.co";
      break;
    case "workable":
      sitePrefix = "site:apply.workable.com";
      break;
    case "wellfound":
      sitePrefix = "site:wellfound.com/jobs";
      break;
  }

  const primaryQuery = cleanLoc
    ? `${sitePrefix} ${cleanTitle} ${cleanLoc}`.trim()
    : `${sitePrefix} ${cleanTitle}`.trim();

  const broaderQuery = `${sitePrefix} ${cleanTitle}`.trim();

  return { primaryQuery, broaderQuery };
}

/**
 * Search Tavily for a single platform with automatic broader query fallback.
 */
export async function searchTavilyForPlatform(
  platform: Platform,
  jobTitle: string,
  location?: string
): Promise<SearchWebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new TavilyApiError("TAVILY_API_KEY is not configured in .env.local");
  }

  const client = tavily({ apiKey });
  const domains = PLATFORM_DOMAINS[platform] ?? [];
  const { primaryQuery, broaderQuery } = buildPlatformQueries(platform, jobTitle, location);

  console.log(
    `[Tavily Search] Platform: ${platform} | Primary query: "${primaryQuery}" | Domains:`,
    domains
  );

  // 1. Try primary query (with location if provided)
  let rawResults: any[] = [];
  try {
    const response = await client.search(primaryQuery, {
      search_depth: "basic",
      max_results: 10,
      include_domains: domains,
    });
    rawResults = response.results ?? [];
    console.log(
      `[Tavily Search] Platform: ${platform} | Primary results count: ${rawResults.length}`
    );
  } catch (err) {
    console.warn(`[Tavily Search] Primary search failed for ${platform}:`, err);
  }

  // 2. If 0 results and location was used, try broader query without location
  if (rawResults.length === 0 && location && primaryQuery !== broaderQuery) {
    console.log(
      `[Tavily Search] Platform: ${platform} | 0 results with location. Trying broader query: "${broaderQuery}"`
    );
    try {
      const response = await client.search(broaderQuery, {
        search_depth: "basic",
        max_results: 10,
        include_domains: domains,
      });
      rawResults = response.results ?? [];
      console.log(
        `[Tavily Search] Platform: ${platform} | Broader results count: ${rawResults.length}`
      );
    } catch (fallbackErr) {
      console.warn(`[Tavily Search] Broader query failed for ${platform}:`, fallbackErr);
    }
  }

  // 3. Normalize to standard SearchWebResult format
  return rawResults.map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    description: r.content ?? "",
    meta_url: r.url
      ? {
          hostname: (() => {
            try {
              return new URL(r.url).hostname;
            } catch {
              return "";
            }
          })(),
        }
      : undefined,
  }));
}

/**
 * Execute searches across all target platforms in parallel using Promise.allSettled.
 * One failing platform does not break the others.
 */
export async function searchTavilyMultiplePlatforms(
  platforms: Platform[],
  jobTitle: string,
  location?: string
): Promise<Record<Platform, SearchWebResult[]>> {
  const results: Record<Platform, SearchWebResult[]> = {
    greenhouse: [],
    lever: [],
    workable: [],
    wellfound: [],
  };

  console.log(
    `[Tavily Search] Starting parallel search across [${platforms.join(", ")}] for title: "${jobTitle}", location: "${location || "(none)"}"`
  );

  const settled = await Promise.allSettled(
    platforms.map(async (platform) => {
      const res = await searchTavilyForPlatform(platform, jobTitle, location);
      return { platform, res };
    })
  );

  for (const item of settled) {
    if (item.status === "fulfilled") {
      results[item.value.platform] = item.value.res;
    } else {
      console.error(
        "[Tavily Search] Platform query rejected in allSettled:",
        item.reason
      );
    }
  }

  return results;
}

// Backward compatibility alias
export const searchTavily = async (query: string): Promise<SearchWebResult[]> => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new TavilyApiError("TAVILY_API_KEY is not configured");
  const client = tavily({ apiKey });
  const res = await client.search(query, { search_depth: "basic", max_results: 10 });
  return (res.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    description: r.content ?? "",
  }));
};

export const searchTavilyMultiple = async (
  queries: Record<string, string>
): Promise<Record<string, SearchWebResult[]>> => {
  const out: Record<string, SearchWebResult[]> = {};
  for (const [k, q] of Object.entries(queries)) {
    out[k] = await searchTavily(q);
  }
  return out;
};
