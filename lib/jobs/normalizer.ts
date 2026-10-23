/**
 * @file lib/jobs/normalizer.ts
 * Maps raw Brave Search results to normalized Job records.
 * Detects platform, tags, company logo, experience level, and job type.
 */

import type { BraveWebResult, Platform, RawNormalizedJob } from "./types";
import { isKnownSkillToken, looksLikeSkillList, sanitizeText } from "./cleaner";

/** Hostname → Platform mapping */
const HOSTNAME_PLATFORM_MAP: Record<string, Platform> = {
  "boards.greenhouse.io": "greenhouse",
  "job-boards.greenhouse.io": "greenhouse",
  "greenhouse.io": "greenhouse",
  "jobs.lever.co": "lever",
  "lever.co": "lever",
  "apply.workable.com": "workable",
  "workable.com": "workable",
  "wellfound.com": "wellfound",
};

/** Common tech tags to scan from job snippets */
const COMMON_TECH_KEYWORDS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "Vue",
  "Angular",
  "AWS",
  "Docker",
  "Kubernetes",
  "GraphQL",
  "SQL",
  "PostgreSQL",
  "Tailwind",
  "CSS",
  "HTML",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "Redux",
  "Express",
  "Django",
  "Ruby",
  "Rails",
  "MongoDB",
  "Redis",
  "GCP",
  "Azure",
  "REST",
  "AI",
];

/**
 * Detect platform from a job URL.
 * Returns null if the URL doesn't match a known platform.
 */
export function detectPlatform(url: string): Platform | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (HOSTNAME_PLATFORM_MAP[hostname]) {
      return HOSTNAME_PLATFORM_MAP[hostname];
    }
    // Check partial domain
    if (hostname.includes("greenhouse.io")) return "greenhouse";
    if (hostname.includes("lever.co")) return "lever";
    if (hostname.includes("workable.com")) return "workable";
    if (hostname.includes("wellfound.com")) return "wellfound";
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract company name from URL path or metadata per platform.
 */
function extractCompany(url: string, platform: Platform, rawTitle?: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split("/").filter(Boolean);

    switch (platform) {
      case "greenhouse":
        return toTitleCase(segments[0] ?? "Tech Company");
      case "lever":
        return toTitleCase(segments[0] ?? "Tech Company");
      case "workable":
        return toTitleCase(segments[0]?.replace(/-/g, " ") ?? "Tech Company");
      case "wellfound": {
        // Example: wellfound.com/jobs/12345-title-at-company
        if (rawTitle && rawTitle.includes(" at ")) {
          const parts = rawTitle.split(" at ");
          return toTitleCase(parts[parts.length - 1]?.split(/[-|]/)[0] ?? "Startup");
        }
        return "Startup";
      }
    }
  } catch {
    return "Tech Company";
  }
}

/** Simple title-case helper */
function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Extract a readable job title from the Brave result title string.
 */
function extractTitle(rawTitle: string): string {
  return sanitizeText(rawTitle)
    .replace(/\s*[|\-–]\s*(greenhouse|lever|workable|wellfound|jobs?).*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
}

/**
 * Extract a location hint from description text.
 *
 * Only real "City, ST" / "City, Country" shaped values are accepted; anything
 * that is actually a technology list (e.g. "Docker, Kubernetes") is discarded
 * so skills can never leak into the location field.
 */
function extractLocation(description: string): string {
  const cleanDescription = sanitizeText(description);
  if (!cleanDescription) return "";

  const locationMatch =
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)\b/.exec(
      cleanDescription
    );
  if (!locationMatch) return "";

  const candidate = locationMatch[0].trim();
  const parts = candidate.split(",").map((part) => part.trim());

  // Reject skill lists / skill tokens masquerading as a place
  if (looksLikeSkillList(candidate)) return "";
  if (parts.some((part) => isKnownSkillToken(part))) return "";

  return candidate;
}

/**
 * Extract salary from description text.
 * Returns the exact matched text from the posting, or null if no salary info is present.
 * Does NOT fall back to any default value.
 */
function extractSalary(description: string): string | null {
  const cleanDescription = sanitizeText(description);
  if (!cleanDescription) return null;

  // Patterns: $95,000 - $120,000 | $140k/yr | AED 15,000 - AED 25,000/month | £50k - £70k p.a. | $85/hr
  const patterns = [
    // Currency code before amount: AED 15,000 - AED 25,000/month
    /\b(USD|AED|PKR|EUR|GBP|CAD|AUD|SGD|INR|CHF)\s*[\d,]+(?:k)?\s*(?:[-–]\s*(?:USD|AED|PKR|EUR|GBP|CAD|AUD|SGD|INR|CHF)?\s*[\d,]+(?:k)?)?(?:\s*[-–\/]\s*(?:year|yr|month|mo|hour|hr|annum|p\.a\.))?/i,
    // Symbol before amount: $95,000 - $120,000 | £50k - £70k | €80,000
    /([$€£¥₹])[\d,]+(?:k)?(?:\s*[-–]\s*[$€£¥₹]?[\d,]+(?:k)?)?(?:\s*[-–\/]\s*(?:year|yr|month|mo|hour|hr|annum|p\.a\.))?/i,
    // Amount after symbol with per-period: $85 - $110 / hour
    /([$€£¥₹][\d,]+(?:k)?(?:\s*[-–]\s*[$€£¥₹]?[\d,]+(?:k)?)?)\s*(?:per|\/)\s*(year|yr|month|mo|hour|hr)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(cleanDescription);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

/**
 * Detect job level from title + description.
 */
function extractLevel(title: string, description: string): string {
  const text = sanitizeText(`${title} ${description}`).toLowerCase();
  if (/\b(staff|principal)\b/.test(text)) return "staff";
  if (/\b(lead|tech lead|architect)\b/.test(text)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(text)) return "senior";
  if (/\b(junior|jr\.?|entry[- ]level|associate|intern)\b/.test(text)) return "junior";
  return "mid";
}

/**
 * Detect job type (e.g. Remote, Full-time, Contract).
 */
function extractJobType(title: string, description: string): string {
  const text = sanitizeText(`${title} ${description}`).toLowerCase();
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  if (text.includes("contract") || text.includes("freelance")) return "Contract";
  if (text.includes("part-time") || text.includes("part time")) return "Part-time";
  if (text.includes("intern") || text.includes("internship")) return "Internship";
  if (text.includes("full-time") || text.includes("full time")) return "Full-time";
  return "";
}

/**
 * Extract tech stack tags from title and description.
 */
function extractTags(title: string, description: string): string[] {
  const text = sanitizeText(`${title} ${description}`);
  const found: string[] = [];

  for (const keyword of COMMON_TECH_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword.replace("+", "\\+")}\\b`, "i");
    if (regex.test(text)) {
      found.push(keyword);
    }
  }

  return Array.from(new Set(found)).slice(0, 5);
}

/**
 * Extract a real posted timestamp when the search result includes one.
 */
function extractPostedAt(title: string, description: string): string | null {
  const text = sanitizeText(`${title} ${description}`);
  if (!text) return null;

  const relativeMatch = /\b(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks)\s+ago\b/i.exec(
    text
  );
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();

    if (unit.startsWith("minute")) {
      date.setMinutes(date.getMinutes() - amount);
    } else if (unit.startsWith("hour")) {
      date.setHours(date.getHours() - amount);
    } else if (unit.startsWith("day")) {
      date.setDate(date.getDate() - amount);
    } else if (unit.startsWith("week")) {
      date.setDate(date.getDate() - amount * 7);
    }

    return date.toISOString();
  }

  if (/\bjust now\b/i.test(text)) {
    return new Date().toISOString();
  }

  const absoluteMatch = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/i.exec(
    text
  );
  if (absoluteMatch) {
    const parsed = new Date(absoluteMatch[0]);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

/**
/**
 * Normalize a single Search result into a RawNormalizedJob.
 * Returns null if the URL doesn't match a known platform or title is too short.
 */
export function normalizeSearchResult(
  result: BraveWebResult,
  hintPlatform?: Platform
): RawNormalizedJob | null {
  const platform = hintPlatform ?? detectPlatform(result.url);
  if (!platform) return null;

  const title = extractTitle(result.title);
  if (!title || title.length < 3) return null;

  const company = extractCompany(result.url, platform, result.title);
  const description = sanitizeText(result.description ?? "");
  const location = extractLocation(description);
  const salary = extractSalary(description);
  const level = extractLevel(title, description);
  const job_type = extractJobType(title, description);
  const tags = extractTags(title, description);
  const posted_at = extractPostedAt(result.title, result.description ?? "");

  return {
    title,
    company,
    company_logo: null,
    platform,
    job_url: result.url,
    source_url: result.url,
    url: result.url,
    location,
    salary,
    job_type,
    experience_level: level,
    level,
    description,
    tags,
    posted_at,
  };
}

export const normalizeBraveResult = normalizeSearchResult;

/**
 * Normalize an array of Search results, deduplicating by URL.
 */
export function normalizeSearchResults(
  results: BraveWebResult[],
  hintPlatform?: Platform
): RawNormalizedJob[] {
  const seen = new Set<string>();
  const normalized: RawNormalizedJob[] = [];

  for (const result of results) {
    if (!result?.url || seen.has(result.url)) continue;
    seen.add(result.url);

    const job = normalizeSearchResult(result, hintPlatform);
    if (job) normalized.push(job);
  }

  return normalized;
}

export const normalizeBraveResults = normalizeSearchResults;
