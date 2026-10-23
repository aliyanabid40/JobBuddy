/**
 * @file lib/jobs/cache.ts
 * DB cache layer for job listings.
 * Manages: staleness check (6h TTL), read from DB, write to DB.
 *
 * All queries run through the Supabase server client with
 * RLS automatically enforced via auth.uid() = user_id policies.
 */

import { createClient } from "@/lib/supabase/server";
import type { Job, JobFilters, Platform } from "./types";
import { filterJobsWithFallback } from "./query-parser";

/** Cache TTL: 6 hours in milliseconds */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Check if the job cache for a user is stale (older than 6h or never fetched).
 */
export async function isCacheStale(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_fetch_log")
    .select("last_fetched_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !data.last_fetched_at) return true;

  const lastFetch = new Date(data.last_fetched_at).getTime();
  const now = Date.now();
  return now - lastFetch > CACHE_TTL_MS;
}

/**
 * Get the last fetch timestamp for a user.
 * Returns null if never fetched.
 */
export async function getLastFetchedAt(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("job_fetch_log")
    .select("last_fetched_at")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.last_fetched_at ?? null;
}

/**
 * Update (upsert) the fetch log for a user.
 */
export async function updateFetchLog(
  userId: string,
  jobCount: number,
  queryUsed: string
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("job_fetch_log").upsert(
    {
      user_id: userId,
      last_fetched_at: new Date().toISOString(),
      job_count: jobCount,
      query_used: queryUsed,
    },
    { onConflict: "user_id" }
  );
}

/**
 * Load cached jobs from DB for a user.
 * Results are sorted by match_score DESC by default.
 */
export async function getJobsFromDB(
  userId: string,
  filters?: JobFilters
): Promise<Job[]> {
  const supabase = await createClient();

  let query = supabase
    .from("jobs_cache")
    .select("*")
    .eq("user_id", userId)
    .order("match_score", { ascending: false })
    .order("fetched_at", { ascending: false });

  // Handle multiple platform filter (selectable platform cards)
  if (filters?.platforms && filters.platforms.length > 0) {
    query = query.in("platform", filters.platforms);
  } else if (filters?.platform && filters.platform !== "all") {
    query = query.eq("platform", filters.platform);
  }

  if (filters?.minMatchScore !== undefined && filters.minMatchScore > 0) {
    query = query.gte("match_score", filters.minMatchScore);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[cache] getJobsFromDB error:", error.message);
    return [];
  }

  const mappedJobs = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    platform: row.platform as Platform,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo ?? null,
    company_domain: row.company_domain ?? null,
    logo_source: row.logo_source ?? null,
    logo_checked_at: row.logo_checked_at ?? null,
    location: row.location ?? "",
    salary: row.salary ?? null,
    job_type: row.job_type ?? "",
    experience_level: row.experience_level ?? row.level ?? "",
    level: row.experience_level ?? row.level ?? "",
    description: row.description ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    match_score: row.match_score ?? 0,
    job_url: row.job_url ?? row.url,
    source_url: row.source_url ?? row.url,
    url: row.job_url ?? row.url,
    posted_at: row.posted_at ?? null,
    applied_status: row.applied_status ?? "not_applied",
    saved_status: Boolean(row.saved_status ?? row.is_saved),
    is_saved: Boolean(row.saved_status ?? row.is_saved),
    fetched_at: row.fetched_at,
    created_at: row.created_at,
  })) as Job[];

  // If search query is provided, use smart title synonym & location alias matcher
  if (filters?.search && filters.search.trim().length > 0) {
    const { matchedJobs } = filterJobsWithFallback(mappedJobs, filters.search);
    return matchedJobs;
  }

  return mappedJobs;
}

/**
 * Delete all cached jobs for a user and insert fresh ones.
 */
export async function replaceJobsInDB(
  userId: string,
  jobs: Omit<Job, "id" | "user_id" | "created_at">[]
): Promise<void> {
  const supabase = await createClient();

  // 1. Delete old cache
  const { error: deleteError } = await supabase
    .from("jobs_cache")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[cache] replaceJobsInDB delete error:", deleteError.message);
    throw new Error(`Failed to clear job cache: ${deleteError.message}`);
  }

  if (jobs.length === 0) return;

  // 2. Insert fresh jobs.
  // Logo cache columns (company_domain / logo_source / logo_checked_at) are
  // written separately by persistCompanyLogos(), so the core job cache never
  // depends on the optional logo migration being applied.
  const rows = jobs.map((job) => ({
    user_id: userId,
    platform: job.platform,
    title: job.title,
    company: job.company,
    company_logo: job.company_logo ?? null,
    location: job.location,
    salary: job.salary,
    job_type: job.job_type,
    experience_level: job.experience_level || job.level || null,
    level: job.experience_level || job.level || null,
    description: job.description,
    tags: Array.isArray(job.tags) ? job.tags : [],
    match_score: job.match_score,
    job_url: job.job_url || job.url,
    source_url: job.source_url || job.url,
    url: job.job_url || job.url,
    posted_at: job.posted_at ?? null,
    applied_status: job.applied_status || "not_applied",
    saved_status: Boolean(job.saved_status ?? job.is_saved),
    is_saved: Boolean(job.saved_status ?? job.is_saved),
    fetched_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("jobs_cache")
    .insert(rows);

  if (insertError) {
    console.error("[cache] replaceJobsInDB insert error:", insertError.message);
    throw new Error(`Failed to cache jobs: ${insertError.message}`);
  }
}

/**
 * Persist resolved logo results for a user's cached jobs, keyed by company.
 * Best-effort: a missing logo cache column must never break job loading, and
 * every row for the same company is updated in one statement.
 */
export async function persistCompanyLogos(
  userId: string,
  results: {
    company: string;
    domain: string | null;
    logoUrl: string | null;
    source: string;
  }[]
): Promise<void> {
  if (!userId || results.length === 0) return;
  const supabase = await createClient();
  const checkedAt = new Date().toISOString();

  for (const result of results) {
    const { error } = await supabase
      .from("jobs_cache")
      .update({
        company_logo: result.logoUrl,
        company_domain: result.domain,
        logo_source: result.source,
        logo_checked_at: checkedAt,
      })
      .eq("user_id", userId)
      .eq("company", result.company);

    if (error) {
      console.warn(
        `[cache] persistCompanyLogos skipped for "${result.company}": ${error.message}`
      );
    }
  }
}

/**
 * Toggle saved_status / is_saved on a single job row.
 */
export async function toggleJobSaved(
  userId: string,
  jobId: string
): Promise<{ saved_status: boolean; is_saved: boolean }> {
  const supabase = await createClient();

  // Fetch current state
  const { data: current, error: fetchErr } = await supabase
    .from("jobs_cache")
    .select("saved_status, is_saved")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !current) {
    throw new Error("Job not found");
  }

  const currentSaved = Boolean(current.saved_status ?? current.is_saved);
  const newSaved = !currentSaved;

  const { error: updateErr } = await supabase
    .from("jobs_cache")
    .update({ saved_status: newSaved, is_saved: newSaved })
    .eq("id", jobId)
    .eq("user_id", userId);

  if (updateErr) {
    throw new Error(`Failed to toggle save: ${updateErr.message}`);
  }

  return { saved_status: newSaved, is_saved: newSaved };
}
