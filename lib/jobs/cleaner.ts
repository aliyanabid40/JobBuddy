/**
 * @file lib/jobs/cleaner.ts
 * Data cleaning and text sanitization helpers for JobBuddy.
 */

/**
 * Strip raw markdown and HTML elements from text.
 * Replaces headers (#####), bold/italics (**), linebreaks (<br>), entities.
 */
export function sanitizeText(text?: string | null): string {
  if (!text) return "";

  const clean = text
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Remove markdown headers e.g. ##### or ###
    .replace(/#{1,6}\s*/g, "")
    // Remove markdown bold/italics e.g. **text** or *text* or _text_
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove markdown links e.g. [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Replace common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Replace multiple spaces/newlines
    .replace(/\s+/g, " ")
    .trim();

  // If text is only punctuation/headers with no alphanumeric characters, treat as empty
  if (!/[a-zA-Z0-9]/.test(clean)) {
    return "";
  }

  return clean;
}

/**
 * Known technology / skill tokens. Used to detect values that are actually a
 * skill list leaking into a field that should hold a place name (see the
 * "Soum shows location = Docker, Kubernetes" bug).
 */
const TECH_SKILL_TOKENS = new Set([
  "docker", "kubernetes", "k8s", "helm", "python", "java", "javascript", "typescript",
  "react", "reactjs", "angular", "vue", "vuejs", "svelte", "node", "nodejs", "golang",
  "go", "rust", "ruby", "rails", "php", "laravel", "django", "flask", "fastapi", "spring",
  "aws", "azure", "gcp", "cloud", "terraform", "ansible", "jenkins", "github", "gitlab",
  "git", "ci", "cd", "sql", "mysql", "postgres", "postgresql", "mongodb", "mongo", "redis",
  "kafka", "rabbitmq", "elasticsearch", "graphql", "rest", "api", "apis", "html", "css",
  "sass", "scss", "tailwind", "nextjs", "express", "nestjs", "c++", "c#", ".net", "dotnet",
  "swift", "kotlin", "flutter", "dart", "scala", "hadoop", "spark", "airflow", "pandas",
  "numpy", "tensorflow", "pytorch", "opencv", "nlp", "llm", "linux", "unix", "bash",
  "shell", "powershell", "figma", "jira", "confluence", "agile", "scrum", "devops",
  "microservices", "grpc", "oauth", "jwt", "s3", "ec2", "lambda", "dynamodb", "firebase",
  "supabase", "selenium", "cypress", "playwright", "jest", "mocha", "webpack", "vite",
  "babel", "eslint", "npm", "yarn", "pnpm", "maven", "gradle", "jquery", "bootstrap",
  "wordpress", "shopify", "salesforce", "sap", "oracle", "excel", "tableau", "powerbi",
]);

/**
 * True when a single token is a known technology / skill name.
 */
export function isKnownSkillToken(value?: string | null): boolean {
  const token = (value ?? "").trim().toLowerCase();
  if (!token) return false;
  return TECH_SKILL_TOKENS.has(token);
}

/**
 * True when a value is really a comma/pipe separated list of technologies
 * (e.g. "Docker, Kubernetes") rather than a place name.
 */
export function looksLikeSkillList(value?: string | null): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;

  const parts = raw
    .split(/[,;|·/]+|\s+and\s+/i)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length < 2) return false;

  // Every single part must be a known technology for this to be a skill list.
  return parts.every((p) => TECH_SKILL_TOKENS.has(p));
}

/**
 * Clean job title. If title equals company name or is empty,
 * fall back to the first clean sentence of description; if that is also
 * unusable, return "" so the caller hides the title row instead of showing
 * a fake placeholder.
 */
export function cleanJobTitle(
  rawTitle?: string | null,
  company?: string | null,
  description?: string | null
): string {
  let title = sanitizeText(rawTitle);
  const comp = sanitizeText(company);

  // Strip trailing platform or board tags
  title = title
    .replace(/\s*[|\-–]\s*(greenhouse|lever|workable|wellfound|jobs?).*/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();

  // Check if title is empty or identical to company name
  if (!title || (comp && title.toLowerCase() === comp.toLowerCase())) {
    if (description) {
      const cleanDesc = sanitizeText(description);
      const firstLine = cleanDesc.split(/[.!?]/)[0]?.trim();
      if (firstLine && firstLine.length > 5 && firstLine.length < 80) {
        // Guard against the description starting with the company name itself
        if (!comp || firstLine.toLowerCase() !== comp.toLowerCase()) {
          return firstLine;
        }
      }
    }
    return "";
  }

  return title;
}

/**
 * Standardize work mode string.
 */
export function normalizeWorkMode(
  rawJobType?: string | null,
  rawLocation?: string | null,
  description?: string | null
): "On-site" | "Remote" | "Hybrid" {
  const combined = `${rawJobType ?? ""} ${rawLocation ?? ""} ${description ?? ""}`.toLowerCase();
  if (combined.includes("remote")) return "Remote";
  if (combined.includes("hybrid")) return "Hybrid";
  return "On-site";
}

/**
 * Standardize seniority level string.
 */
export function normalizeSeniorityLevel(
  rawLevel?: string | null,
  rawTitle?: string | null
): "Junior" | "Mid-level" | "Senior" | "Lead" | "Staff" {
  const combined = `${rawLevel ?? ""} ${rawTitle ?? ""}`.toLowerCase();
  if (/\b(staff|principal)\b/.test(combined)) return "Staff";
  if (/\b(lead|tech lead|architect|manager)\b/.test(combined)) return "Lead";
  if (/\b(senior|sr\.?)\b/.test(combined)) return "Senior";
  if (/\b(junior|jr\.?|entry|associate|intern)\b/.test(combined)) return "Junior";
  return "Mid-level";
}

/**
 * Clean location string and deduplicate against work mode.
 * Returns null if location is missing, "Remote", or duplicate.
 */
export function cleanLocation(
  rawLocation?: string | null,
  workMode?: string
): string | null {
  const cleanLoc = sanitizeText(rawLocation);
  if (!cleanLoc) return null;

  const lowerLoc = cleanLoc.toLowerCase();
  const lowerMode = (workMode ?? "").toLowerCase();

  // If location is "Remote", "Competitive", or equals work mode, don't duplicate
  if (
    lowerLoc === "remote" ||
    lowerLoc === "competitive" ||
    lowerLoc === lowerMode ||
    lowerLoc === "n/a"
  ) {
    return null;
  }

  // Guard against a skill list leaking into the location field (e.g. "Docker, Kubernetes")
  if (looksLikeSkillList(cleanLoc)) {
    return null;
  }

  return cleanLoc;
}

/**
 * Clean salary string. Returns real salary string or null.
 * Rejects fake or default placeholders like "Competitive".
 */
export function cleanSalary(rawSalary?: string | null): string | null {
  const clean = sanitizeText(rawSalary);
  if (!clean) return null;

  const lower = clean.toLowerCase();
  if (
    lower === "competitive" ||
    lower === "competitive salary" ||
    lower === "n/a" ||
    lower === "undisclosed" ||
    lower === "tbd"
  ) {
    return null;
  }

  return clean;
}

/**
 * Format relative posted time (e.g. "just now", "5 minutes ago", "3 hours ago", "2 days ago", "3 weeks ago").
 * Returns null if no valid date string.
 */
export function formatPostedRelativeDate(dateString?: string | null): string | null {
  if (!dateString) return null;

  const timeMs = new Date(dateString).getTime();
  if (isNaN(timeMs)) return null;

  const diffMs = Date.now() - timeMs;
  if (diffMs < 0) return "just now";

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 21) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  return `${diffWeeks} weeks ago`;
}

/**
 * Clean and deduplicate skill tags. Removes placeholders like "Competitive".
 */
export function cleanSkillTags(tags?: string[] | null): string[] {
  if (!tags || !Array.isArray(tags)) return [];

  const seen = new Set<string>();
  const clean: string[] = [];

  for (const rawTag of tags) {
    const tag = sanitizeText(rawTag);
    if (!tag) continue;

    const lower = tag.toLowerCase();
    if (
      lower === "competitive" ||
      lower === "n/a" ||
      lower === "full-time" ||
      lower === "remote"
    ) {
      continue;
    }

    if (!seen.has(lower)) {
      seen.add(lower);
      clean.push(tag);
    }
  }

  return clean;
}
