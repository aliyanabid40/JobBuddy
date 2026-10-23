/**
 * @file lib/jobs/query-parser.ts
 * Query parser and matching engine for job title and location searches.
 *
 * Requirements:
 *  1. Parse search query into title keywords & location (strip filler words: "in", "jobs", "at", etc.).
 *     Supports patterns: "ML Engineer in Dubai jobs", "Dubai ML Engineer", "ML Engineer Dubai", "ML Engineer".
 *  2. Matching logic:
 *     - Title: case-insensitive, fuzzy/partial match, synonyms (ML ~ Machine Learning ~ AI/ML).
 *     - Location: city, country, region aliases (Dubai ~ UAE ~ United Arab Emirates, Remote).
 *  3. Fallback: if location filtering yields 0 jobs, return title-matched jobs with fallback message.
 */

import type { Job } from "./types";

export interface ParsedJobQuery {
  title: string;
  location: string;
  rawQuery: string;
  hasExplicitLocation: boolean;
}

const FILLER_WORDS = new Set([
  "jobs",
  "job",
  "in",
  "at",
  "near",
  "for",
  "with",
  "hiring",
  "positions",
  "position",
  "roles",
  "role",
  "openings",
  "opening",
  "opportunities",
  "vacancy",
  "vacancies",
]);

/**
 * Common locations and their aliases. Ordered from most specific (longer) to shorter
 * so "United Arab Emirates" matches before "UAE", etc.
 */
export const LOCATION_ALIASES: Record<string, string[]> = {
  dubai: ["dubai", "uae", "united arab emirates", "remote", "worldwide", "anywhere", "work from home"],
  uae: ["uae", "united arab emirates", "dubai", "abu dhabi", "sharjah", "remote", "worldwide", "anywhere"],
  "united arab emirates": ["united arab emirates", "uae", "dubai", "abu dhabi", "remote"],
  "abu dhabi": ["abu dhabi", "uae", "united arab emirates", "dubai", "remote"],
  pakistan: ["pakistan", "lahore", "karachi", "islamabad", "rawalpindi", "remote", "worldwide"],
  lahore: ["lahore", "pakistan", "remote"],
  karachi: ["karachi", "pakistan", "remote"],
  islamabad: ["islamabad", "pakistan", "remote"],
  london: ["london", "uk", "united kingdom", "remote", "worldwide"],
  uk: ["uk", "united kingdom", "london", "manchester", "birmingham", "remote"],
  "united kingdom": ["united kingdom", "uk", "london", "remote"],
  "san francisco": ["san francisco", "sf", "bay area", "california", "ca", "remote"],
  sf: ["sf", "san francisco", "bay area", "california", "remote"],
  "bay area": ["bay area", "san francisco", "silicon valley", "california", "remote"],
  "new york": ["new york", "nyc", "ny", "manhattan", "remote"],
  nyc: ["nyc", "new york", "ny", "remote"],
  berlin: ["berlin", "germany", "deutschland", "remote"],
  germany: ["germany", "berlin", "munich", "remote"],
  toronto: ["toronto", "canada", "ontario", "remote"],
  canada: ["canada", "toronto", "vancouver", "remote"],
  singapore: ["singapore", "sg", "remote"],
  remote: ["remote", "worldwide", "anywhere", "work from home", "wfh", "telecommute"],
  us: ["us", "usa", "united states", "remote"],
  usa: ["usa", "us", "united states", "remote"],
  "united states": ["united states", "usa", "us", "remote"],
  india: ["india", "bangalore", "bengaluru", "delhi", "mumbai", "hyderabad", "remote"],
  bangalore: ["bangalore", "bengaluru", "india", "remote"],
  qatar: ["qatar", "doha", "remote"],
  doha: ["doha", "qatar", "remote"],
  riyadh: ["riyadh", "saudi", "saudi arabia", "remote"],
  saudi: ["saudi", "saudi arabia", "riyadh", "remote"],
  "saudi arabia": ["saudi arabia", "saudi", "riyadh", "remote"],
};

/**
 * Title synonym clusters. Any token in the array matches any other.
 */
export const TITLE_SYNONYMS: string[][] = [
  [
    "ml engineer",
    "machine learning engineer",
    "ai engineer",
    "ai/ml engineer",
    "ai ml engineer",
    "mlops engineer",
    "machine learning",
    "ml",
  ],
  [
    "ai engineer",
    "artificial intelligence engineer",
    "applied ai engineer",
    "genai engineer",
    "generative ai engineer",
    "ai/ml engineer",
    "llm engineer",
  ],
  [
    "frontend developer",
    "frontend engineer",
    "front end developer",
    "front-end developer",
    "ui engineer",
    "react developer",
    "web developer",
    "react frontend developer",
  ],
  [
    "backend developer",
    "backend engineer",
    "back end developer",
    "back-end developer",
    "api engineer",
    "node developer",
    "python developer",
    "software engineer, backend",
  ],
  [
    "full stack developer",
    "full stack engineer",
    "fullstack developer",
    "fullstack engineer",
    "full-stack developer",
    "software engineer",
  ],
  [
    "data scientist",
    "data science",
    "data analyst",
    "machine learning scientist",
  ],
  [
    "data engineer",
    "analytics engineer",
    "big data engineer",
  ],
  [
    "devops engineer",
    "site reliability engineer",
    "sre",
    "cloud engineer",
    "platform engineer",
    "infrastructure engineer",
  ],
];

/**
 * Parse search query into:
 * - title keywords (e.g. "ML Engineer")
 * - location (e.g. "Dubai")
 */
export function parseJobQuery(rawQuery: string): ParsedJobQuery {
  if (!rawQuery || !rawQuery.trim()) {
    return {
      title: "",
      location: "",
      rawQuery: "",
      hasExplicitLocation: false,
    };
  }

  const cleanRaw = rawQuery.trim();
  let text = cleanRaw.toLowerCase();

  let extractedLocation = "";

  // 1. Check preposition pattern: "in Dubai", "at London", "near SF", "for UAE"
  const prepRegex = /\b(?:in|at|near|for)\s+([a-z\s]+?)(?:\s+(?:jobs|job|roles|positions))?$/i;
  const prepMatch = text.match(prepRegex);
  if (prepMatch && prepMatch[1]) {
    const candidate = prepMatch[1].trim();
    if (candidate && !FILLER_WORDS.has(candidate)) {
      extractedLocation = candidate;
      text = text.slice(0, prepMatch.index).trim();
    }
  }

  // 2. If no preposition match, scan known location keys (longer ones first)
  if (!extractedLocation) {
    const knownKeys = Object.keys(LOCATION_ALIASES).sort(
      (a, b) => b.length - a.length
    );
    for (const key of knownKeys) {
      const boundaryRegex = new RegExp(`\\b${escapeRegExp(key)}\\b`, "i");
      if (boundaryRegex.test(text)) {
        extractedLocation = key;
        text = text.replace(boundaryRegex, " ").trim();
        break;
      }
    }
  }

  // 3. Strip remaining filler words from the title
  const rawWords = text.split(/\s+/).filter((w) => w && !FILLER_WORDS.has(w));
  const cleanTitle = rawWords.join(" ").replace(/[,.-]/g, " ").replace(/\s+/g, " ").trim();

  // Normalize capitalization
  const titleFormatted = cleanTitle
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (["ml", "ai", "ui", "ux", "qa", "it", "db"].includes(lower)) {
        return lower.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

  const locationFormatted = extractedLocation
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (["uae", "uk", "usa", "us", "sf", "nyc"].includes(lower)) {
        return lower.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

  return {
    title: titleFormatted,
    location: locationFormatted,
    rawQuery: cleanRaw,
    hasExplicitLocation: Boolean(locationFormatted),
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a job title matches target title using fuzzy partial + synonym matches.
 */
export function matchesTitle(jobTitle: string, targetTitle: string): boolean {
  if (!targetTitle || !targetTitle.trim()) return true;
  if (!jobTitle) return false;

  const jLower = jobTitle.toLowerCase();
  const tLower = targetTitle.toLowerCase().trim();

  // 1. Direct substring
  if (jLower.includes(tLower)) return true;

  // 2. Check synonym clusters
  for (const cluster of TITLE_SYNONYMS) {
    const targetInCluster = cluster.some(
      (syn) => tLower.includes(syn) || syn.includes(tLower)
    );
    if (targetInCluster) {
      for (const syn of cluster) {
        if (jLower.includes(syn)) return true;
      }
    }
  }

  // 3. Token-based overlap
  const tTokens = tLower
    .split(/\s+/)
    .filter((w) => !FILLER_WORDS.has(w) && w.length > 1);

  if (tTokens.length > 0) {
    const GENERIC_ROLE_WORDS = new Set([
      "engineer",
      "developer",
      "specialist",
      "consultant",
      "analyst",
      "intern",
      "manager",
      "lead",
      "senior",
      "junior",
      "staff",
      "principal",
    ]);

    const domainTokens = tTokens.filter((tok) => !GENERIC_ROLE_WORDS.has(tok));
    // If there are domain-specific tokens (e.g. 'ml', 'frontend', 'react'), at least one must match
    if (domainTokens.length > 0) {
      const hasDomainMatch = domainTokens.some((tok) => {
        const regex = new RegExp(`\\b${escapeRegExp(tok)}\\b`, "i");
        return regex.test(jLower) || jLower.includes(tok);
      });
      if (!hasDomainMatch) {
        return false;
      }
    }

    const matchedTokens = tTokens.filter((tok) => jLower.includes(tok));
    if (matchedTokens.length / tTokens.length >= 0.5) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a job's location matches target location using aliases + remote.
 */
export function matchesLocation(jobLocation: string, targetLocation: string): boolean {
  if (!targetLocation || !targetLocation.trim()) return true;
  if (!jobLocation) return false;

  const jLower = jobLocation.toLowerCase();
  const tLower = targetLocation.toLowerCase().trim();

  // 1. Direct match
  if (jLower.includes(tLower)) return true;

  // 2. Look up aliases
  const aliases = LOCATION_ALIASES[tLower];
  if (aliases && aliases.length > 0) {
    for (const alias of aliases) {
      if (jLower.includes(alias)) return true;
    }
  }

  // 3. If target is Remote, match remote indicators
  if (tLower === "remote" || tLower === "work from home" || tLower === "wfh") {
    return (
      jLower.includes("remote") ||
      jLower.includes("anywhere") ||
      jLower.includes("worldwide") ||
      jLower.includes("wfh")
    );
  }

  return false;
}

/**
 * Filter jobs based on parsed query with automatic fallback to title-only
 * if no jobs match the location filter.
 */
export function filterJobsWithFallback(
  jobs: Job[],
  searchQuery: string
): {
  matchedJobs: Job[];
  isFallback: boolean;
  fallbackMessage?: string;
  parsed: ParsedJobQuery;
} {
  const parsed = parseJobQuery(searchQuery);

  if (!parsed.title && !parsed.location) {
    return {
      matchedJobs: jobs,
      isFallback: false,
      parsed,
    };
  }

  // 1. Filter by Title & keywords
  const titleMatchedJobs = jobs.filter((job) => {
    if (!parsed.title) return true;
    const titleOk = matchesTitle(job.title, parsed.title);
    const tagsOk = (job.tags ?? []).some((t) => matchesTitle(t, parsed.title));
    const descOk = (job.description ?? "")
      .toLowerCase()
      .includes(parsed.title.toLowerCase());
    const companyOk = (job.company ?? "")
      .toLowerCase()
      .includes(parsed.title.toLowerCase());
    return titleOk || tagsOk || descOk || companyOk;
  });

  // If no explicit location was provided, return title matches
  if (!parsed.hasExplicitLocation) {
    return {
      matchedJobs: titleMatchedJobs,
      isFallback: false,
      parsed,
    };
  }

  // 2. Filter by Location
  const exactLocationMatched = titleMatchedJobs.filter((job) =>
    matchesLocation(job.location, parsed.location)
  );

  // If we found matches in the location, return them
  if (exactLocationMatched.length > 0) {
    return {
      matchedJobs: exactLocationMatched,
      isFallback: false,
      parsed,
    };
  }

  // 3. Fallback: If 0 matches with location, fallback to title-only matches
  if (titleMatchedJobs.length > 0) {
    return {
      matchedJobs: titleMatchedJobs,
      isFallback: true,
      fallbackMessage: `No exact matches in ${parsed.location}, showing similar roles`,
      parsed,
    };
  }

  // If still 0, return empty
  return {
    matchedJobs: [],
    isFallback: false,
    parsed,
  };
}
