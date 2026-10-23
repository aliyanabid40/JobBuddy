/**
 * @file lib/jobs/normalizer.ts
 * Maps raw Brave Search results to normalized Job records.
 * Detects platform, tags, company logo, experience level, and job type.
 */

import type { BraveWebResult, Platform, RawNormalizedJob } from "./types";

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
  return rawTitle
    .replace(/\s*[|\-–]\s*(greenhouse|lever|workable|wellfound|jobs?).*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
}

/**
 * Extract location hint from description text.
 */
function extractLocation(description: string): string {
  const remoteMatch = /\b(remote|hybrid|on-?site)\b/i.exec(description);
  if (remoteMatch) return toTitleCase(remoteMatch[1]);

  const locationMatch =
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+))\b/.exec(
      description
    );
  return locationMatch?.[1] ?? "Remote";
}

/**
 * Extract salary from description text.
 * Returns the exact matched text from the posting, or null if no salary info is present.
 * Does NOT fall back to any default value.
 */
function extractSalary(description: string): string | null {
  if (!description) return null;

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
    const match = pattern.exec(description);
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
  const text = `${title} ${description}`.toLowerCase();
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
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  if (text.includes("contract") || text.includes("freelance")) return "Contract";
  if (text.includes("part-time") || text.includes("part time")) return "Part-time";
  if (text.includes("intern") || text.includes("internship")) return "Internship";
  return "Full-time";
}

/**
 * Extract tech stack tags from title and description.
 */
function extractTags(title: string, description: string): string[] {
  const text = `${title} ${description}`;
  const found: string[] = [];

  for (const keyword of COMMON_TECH_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword.replace("+", "\\+")}\\b`, "i");
    if (regex.test(text)) {
      found.push(keyword);
    }
  }

  // Ensure 2-4 tags
  if (found.length === 0) {
    return ["React", "TypeScript", "Frontend"];
  }
  return Array.from(new Set(found)).slice(0, 5);
}

/**
 * Build company logo URL.
 */
function buildCompanyLogo(company: string): string {
  const clean = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean || clean === "techcompany" || clean === "startup") {
    return "";
  }
  return `https://www.google.com/s2/favicons?domain=${clean}.com&sz=128`;
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
  const description = result.description ?? "";
  const location = extractLocation(description);
  const salary = extractSalary(description);
  const level = extractLevel(title, description);
  const job_type = extractJobType(title, description);
  const tags = extractTags(title, description);
  const company_logo = buildCompanyLogo(company);

  return {
    title,
    company,
    company_logo,
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
