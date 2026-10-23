"use server";

/**
 * @file features/jobs/actions.ts
 * Server Actions for the Job Discovery Engine (Phase 5).
 *
 * fetchJobsForUser  — orchestrates 6-hour cache check or Brave API query
 * toggleSaveJob     — toggles saved_status / is_saved in Supabase
 * refreshJobCache   — forces cache invalidation and re-fetches
 */

import { createClient } from "@/lib/supabase/server";
import {
  isCacheStale,
  getJobsFromDB,
  replaceJobsInDB,
  updateFetchLog,
  getLastFetchedAt,
  toggleJobSaved,
} from "@/lib/jobs/cache";
import { buildPlatformQuery, ALL_PLATFORMS } from "@/lib/jobs/query-builder";
import { searchTavilyMultiplePlatforms } from "@/lib/jobs/tavily";
import { normalizeSearchResults } from "@/lib/jobs/normalizer";
import { calculateMatchScore } from "@/lib/jobs/match-score";
import { parseJobQuery, filterJobsWithFallback } from "@/lib/jobs/query-parser";
import type {
  Job,
  JobFilters,
  JobsResult,
  UserProfileForJobs,
  Platform,
} from "@/lib/jobs/types";
import { revalidatePath } from "next/cache";

// ─── Helper: Load user profile from Supabase ─────────────────────────────────

export async function loadUserProfileForJobs(userId: string): Promise<UserProfileForJobs> {
  const supabase = await createClient();

  const [profileRes, skillsRes, expRes, eduRes, projRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("location, summary, full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("skills")
      .select("name, category")
      .eq("user_id", userId)
      .limit(30),
    supabase
      .from("experiences")
      .select("title, company, description, is_current")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("educations")
      .select("degree, field_of_study, institution")
      .eq("user_id", userId)
      .limit(2),
    supabase
      .from("projects")
      .select("technologies")
      .eq("user_id", userId)
      .limit(5),
  ]);

  const profile = profileRes.data as Record<string, any> | null;
  const skills = (skillsRes.data ?? []).map((s) => s.name);
  const currentExp = expRes.data?.find((e) => e.is_current) ?? expRes.data?.[0];
  const company = currentExp?.company ?? "";

  const education = eduRes.data?.[0]
    ? `${eduRes.data[0].degree ?? ""} ${eduRes.data[0].field_of_study ?? ""}`.trim()
    : "";

  const projTech = (projRes.data ?? []).flatMap((p) => p.technologies ?? []);
  const tech_stack = Array.from(new Set([...skills, ...projTech]));

  // 4. Get jobTitle and location from user profile (profiles table).
  const rawJobTitle = (profile?.job_title || profile?.title || profile?.target_role || "").trim();
  let derivedRole = "Software Engineer";
  if (rawJobTitle) {
    derivedRole = rawJobTitle;
  } else if (
    skills.some((s) => /machine learning|scikit|nlp|deep learning|llm|ai/i.test(s)) ||
    /artificial intelligence|machine learning|ai-powered/i.test(profile?.summary ?? "")
  ) {
    derivedRole = "Machine Learning Engineer";
  } else if (currentExp?.title && !/intern/i.test(currentExp.title)) {
    derivedRole = currentExp.title;
  }

  const rawLocation = (profile?.location ?? "").trim();
  // If location is empty or "Remote", skip it in query (pass empty string)
  const cleanLocation =
    rawLocation.toLowerCase() === "remote" ? "" : rawLocation;

  return {
    role: derivedRole,
    skills,
    experience: company ? `${derivedRole} at ${company}` : derivedRole,
    education,
    preferred_location: cleanLocation,
    tech_stack,
    job_type: "Remote",
    summary: profile?.summary ?? "",
    title: derivedRole,
    location: cleanLocation,
  };
}

// ─── Main: Fetch Jobs (6h cache-first) ───────────────────────────────────────

/**
 * Fetch jobs for the authenticated user.
 * Checks if jobs were fetched in the last 6 hours:
 * - If fresh (< 6h), serves directly from Supabase jobs_cache table.
 * - If older than 6 hours or never fetched, queries Tavily Search API, normalizes,
 *   scores, and caches them in Supabase before returning.
 */
export async function fetchJobsForUser(
  filters?: JobFilters
): Promise<JobsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = user.id;
    const stale = await isCacheStale(userId);
    const hasSearchFilter = Boolean(filters?.search?.trim());

    // ── 1. Serve from 6-hour cache (only if cache actually has jobs and not searching a new role) ──
    if (!stale && !hasSearchFilter) {
      const jobs = await getJobsFromDB(userId, filters);
      if (jobs.length > 0) {
        const lastFetched = await getLastFetchedAt(userId);
        return {
          ok: true,
          jobs,
          fromCache: true,
          lastFetched,
          jobCount: jobs.length,
        };
      }
      // If cached count is 0, cache is empty or incomplete — proceed to fetch fresh jobs
    }

    // ── 2. Cache stale, empty, or custom search query: Fetch from Tavily API ───────────
    const userProfile = await loadUserProfileForJobs(userId);
    let jobTitle = userProfile.role || "Machine Learning Engineer";
    let location = userProfile.preferred_location || "";

    if (filters?.search && filters.search.trim()) {
      const parsed = parseJobQuery(filters.search);
      if (parsed.title) {
        jobTitle = parsed.title;
      }
      if (parsed.hasExplicitLocation) {
        location = parsed.location;
      } else {
        location = userProfile.preferred_location || "";
      }
      console.log(
        `[actions.ts] Parsed query: "${filters.search}" -> jobTitle: "${jobTitle}", location: "${location || "(none)"}"`
      );
    }

    // Build platform queries (use selected platforms or all)
    const targetPlatforms: Platform[] =
      filters?.platforms && filters.platforms.length > 0
        ? filters.platforms
        : ALL_PLATFORMS;

    let searchResults: Record<Platform, any[]> = {
      greenhouse: [],
      lever: [],
      workable: [],
      wellfound: [],
    };

    try {
      searchResults = await searchTavilyMultiplePlatforms(
        targetPlatforms,
        jobTitle,
        location
      );
    } catch (err) {
      console.warn("[fetchJobsForUser] Tavily search error:", err);
      // If search API fails, fall back to existing cache
      const cachedJobs = await getJobsFromDB(userId, filters);
      if (cachedJobs.length > 0) {
        return {
          ok: true,
          jobs: cachedJobs,
          fromCache: true,
          lastFetched: await getLastFetchedAt(userId),
          jobCount: cachedJobs.length,
        };
      }
      throw err;
    }

    // Normalize + score results
    const allJobs: Omit<Job, "id" | "user_id" | "created_at">[] = [];
    const scoringProfile: UserProfileForJobs = {
      ...userProfile,
      preferred_location: location || userProfile.preferred_location,
      role: jobTitle,
    };

    for (const [platform, results] of Object.entries(searchResults)) {
      const normalized = normalizeSearchResults(results, platform as Platform);
      for (const job of normalized) {
        const score = calculateMatchScore(job, scoringProfile);
        allJobs.push({
          ...job,
          match_score: score,
          applied_status: "not_applied",
          saved_status: false,
          is_saved: false,
          fetched_at: new Date().toISOString(),
        });
      }
    }

    // Save fresh jobs to Supabase jobs_cache table if jobs were found
    if (allJobs.length > 0) {
      await replaceJobsInDB(userId, allJobs);
    }

    // Update fetch log timestamp
    const queryUsed = `${jobTitle} ${location}`.trim();
    await updateFetchLog(userId, allJobs.length, queryUsed);

    // Return filtered jobs from DB
    const jobs = await getJobsFromDB(userId, filters);
    let fallbackMessage: string | undefined;

    if (filters?.search && filters.search.trim()) {
      const filtered = filterJobsWithFallback(jobs, filters.search);
      if (filtered.isFallback) {
        fallbackMessage = filtered.fallbackMessage;
      }
    }

    const lastFetched = new Date().toISOString();

    return {
      ok: true,
      jobs,
      fromCache: false,
      lastFetched,
      jobCount: jobs.length,
      fallbackMessage,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[fetchJobsForUser] error:", message);
    return { ok: false, error: message };
  }
}

// ─── Toggle Save Job ──────────────────────────────────────────────────────────

export async function toggleSaveJob(
  jobId: string
): Promise<{ ok: boolean; saved_status?: boolean; is_saved?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Not authenticated" };
    }

    const result = await toggleJobSaved(user.id, jobId);
    revalidatePath("/dashboard/jobs");
    revalidatePath("/dashboard");
    return {
      ok: true,
      saved_status: result.saved_status,
      is_saved: result.is_saved,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

// ─── Force Refresh Cache ──────────────────────────────────────────────────────

export async function refreshJobCache(filters?: JobFilters): Promise<JobsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Not authenticated" };
    }

    // Invalidate fetch log so isCacheStale returns true
    await supabase
      .from("job_fetch_log")
      .delete()
      .eq("user_id", user.id);

    return await fetchJobsForUser(filters);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
