/**
 * @file lib/jobs/types.ts
 * Shared TypeScript types for the Job Discovery Engine (Phase 5)
 */

export type Platform = "greenhouse" | "lever" | "workable" | "wellfound";
export type JobLevel = "junior" | "mid" | "senior" | "staff" | "lead";

/** Normalized job record stored in jobs_cache table */
export interface Job {
  id: string;
  user_id: string;
  platform: Platform;
  title: string;
  company: string;
  company_logo?: string | null;
  company_domain?: string | null;
  logo_source?: string | null;
  logo_checked_at?: string | null;
  location: string;
  salary: string | null;
  job_type: string;           // "Full-time" | "Remote" | "Contract" etc.
  experience_level: string;   // "junior" | "mid" | "senior" | "staff" | "lead"
  level?: string;             // backward compatibility
  description: string;
  tags: string[];             // string array (stored as jsonb in DB)
  match_score: number;        // 0-100
  job_url: string;            // target job url
  source_url: string;         // source/search result url
  url?: string;               // backward compatibility fallback
  posted_at?: string | null;
  applied_status: string;     // 'not_applied' | 'applied'
  saved_status: boolean;      // true if saved
  is_saved?: boolean;         // backward compatibility fallback
  fetched_at: string;
  created_at: string;
}

/** Raw result from Search API (Tavily) */
export interface SearchWebResult {
  title: string;
  url: string;
  description: string;
  meta_url?: {
    hostname: string;
  };
}

/** Backward compatibility alias for SearchWebResult */
export type BraveWebResult = SearchWebResult;

export interface SearchResponse {
  results: SearchWebResult[];
}

export type BraveSearchResponse = SearchResponse;

/** Normalized job before match score and user metadata are applied */
export interface RawNormalizedJob {
  title: string;
  company: string;
  company_logo?: string | null;
  company_domain?: string | null;
  logo_source?: string | null;
  logo_checked_at?: string | null;
  platform: Platform;
  job_url: string;
  source_url: string;
  url?: string;
  location: string;
  salary: string | null;
  job_type: string;
  experience_level: string;
  level?: string;
  description: string;
  tags: string[];
  posted_at?: string | null;
}

/** Filters the user can apply on the job list UI */
export interface JobFilters {
  platforms?: Platform[];
  platform?: Platform | "all";
  minMatchScore?: number;
  search?: string;
}

/** User profile shape needed by query builder & match scorer */
export interface UserProfileForJobs {
  role?: string;               // primary role / title
  skills: string[];           // skill names
  experience?: string;         // latest company & title or total years
  education?: string;          // degree / field of study
  preferred_location?: string; // preferred location
  tech_stack?: string[];       // tech stack from projects/skills
  job_type?: string;           // "Remote" or "Full-time"
  summary?: string;
  // compatibility aliases
  title?: string;
  location?: string;
}

/** Return shape of fetchJobsForUser server action */
export type JobsResult =
  | {
      ok: true;
      jobs: Job[];
      fromCache: boolean;
      lastFetched: string | null;
      jobCount: number;
      fallbackMessage?: string;
    }
  | {
      ok: false;
      error: string;
    };
