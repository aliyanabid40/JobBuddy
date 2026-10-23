"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Job, Platform } from "@/lib/jobs/types";
import { fetchJobsForUser, refreshJobCache } from "@/features/jobs/actions";
import { WelcomeBanner } from "./welcome-banner";
import { PlatformSelector } from "./platform-selector";
import { JobRow } from "./job-row";
import {
  JobsLoadingSkeleton,
  JobsEmptyState,
  JobsErrorState,
} from "./jobs-skeleton";
import { JobsSidebar } from "./jobs-sidebar";
import { Search, ArrowUpDown, Info, Briefcase, Bookmark, CheckSquare, X } from "lucide-react";
import { filterJobsWithFallback } from "@/lib/jobs/query-parser";

interface JobsDashboardClientProps {
  initialJobs: Job[];
  initialLastFetchedAt: string | null;
  initialFromCache: boolean;
  userName: string;
  completenessScore: number;
}

const ALL_PLATFORMS: Platform[] = [
  "greenhouse",
  "lever",
  "workable",
  "wellfound",
];

type ViewTab = "all" | "applied" | "saved";

const TABS: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All Jobs", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: "applied", label: "Applied", icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="w-3.5 h-3.5" /> },
];

export function JobsDashboardClient({
  initialJobs,
  initialLastFetchedAt,
  initialFromCache,
  userName,
  completenessScore,
}: JobsDashboardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active tab from URL param ?view=all|applied|saved (default "all")
  const rawView = searchParams.get("view") ?? "all";
  const activeTab: ViewTab = (["all", "applied", "saved"].includes(rawView)
    ? rawView
    : "all") as ViewTab;

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(
    initialLastFetchedAt
  );
  const [fromCache, setFromCache] = useState(initialFromCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  // Selected platforms (default all selected)
  const [selectedPlatforms, setSelectedPlatforms] =
    useState<Platform[]>(ALL_PLATFORMS);

  // Main Tavily online search input
  const [searchQuery, setSearchQuery] = useState("");

  // Compact header search input (client-side debounced ~200ms)
  const [rawCompactSearch, setRawCompactSearch] = useState("");
  const [debouncedCompactSearch, setDebouncedCompactSearch] = useState("");

  // Debounce compact section header search input (~200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCompactSearch(rawCompactSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [rawCompactSearch]);

  // Unique company key so the effect only re-runs when the company set changes
  // (never on the logo state updates it itself writes back).
  const companyKey = useMemo(
    () =>
      Array.from(
        new Set(jobs.map((j) => `${j.company}`.trim().toLowerCase()))
      )
        .sort()
        .join("|"),
    [jobs]
  );

  // Trigger server-side logo resolution for logos that are missing or stale.
  useEffect(() => {
    if (jobs.length === 0) return;

    const snapshot = jobs;
    fetch("/api/logo/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobs: snapshot.map((j) => ({
          company: j.company,
          company_logo: j.company_logo,
          company_domain: j.company_domain,
          logo_source: j.logo_source,
          logo_checked_at: j.logo_checked_at,
          description: j.description,
          job_url: j.job_url || j.url,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok || !Array.isArray(data.results) || data.results.length === 0) {
          return;
        }

        const byCompany = new Map<
          string,
          {
            logoUrl: string | null;
            domain: string | null;
            source: string | null;
          }
        >();
        for (const r of data.results as {
          company?: string;
          logoUrl?: string | null;
          domain?: string | null;
          source?: string | null;
        }[]) {
          if (!r?.company) continue;
          byCompany.set(r.company.trim().toLowerCase(), {
            logoUrl: r.logoUrl ?? null,
            domain: r.domain ?? null,
            source: r.source ?? null,
          });
        }
        if (byCompany.size === 0) return;

        const checkedAt = new Date().toISOString();
        setJobs((prev) =>
          prev.map((j) => {
            const resolved = byCompany.get(j.company.trim().toLowerCase());
            if (!resolved) return j;
            // Only apply when something actually changed (keeps renders stable).
            if (
              (j.company_logo ?? null) === resolved.logoUrl &&
              (j.company_domain ?? null) === resolved.domain
            ) {
              return j;
            }
            return {
              ...j,
              company_logo: resolved.logoUrl,
              company_domain: resolved.domain,
              logo_source: resolved.source,
              logo_checked_at: checkedAt,
            };
          })
        );
      })
      .catch(() => {
        // ignore background logo resolution errors
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyKey]);

  function setTab(tab: ViewTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tab);
    router.push(`/dashboard/jobs?${params.toString()}`);
  }

  // Toggle platform selection
  function handleTogglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        if (prev.length === 1) {
          return ALL_PLATFORMS;
        }
        return prev.filter((p) => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  }

  // Refresh jobs via Tavily API
  function handleRefreshJobs(queryOverride?: string) {
    setError(null);
    setFallbackNotice(null);
    startRefreshTransition(async () => {
      try {
        const searchTerm =
          queryOverride !== undefined
            ? queryOverride
            : searchQuery.trim() || undefined;

        const result = await refreshJobCache({
          platforms: selectedPlatforms,
          search: searchTerm,
        });
        if (result.ok) {
          setJobs(result.jobs);
          setLastFetchedAt(result.lastFetched);
          setFromCache(false);
          setFallbackNotice(result.fallbackMessage || null);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to refresh jobs"
        );
      }
    });
  }

  // Save toggle — update local state immediately for snappy UI
  function handleSaveToggled(jobId: string, saved_status: boolean) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, saved_status, is_saved: saved_status } : j
      )
    );
  }

  // Calculate real platform counts based on current search query
  const platformCounts = useMemo(() => {
    const counts: Record<Platform, number> = {
      greenhouse: 0,
      lever: 0,
      workable: 0,
      wellfound: 0,
    };
    const relevantJobs = searchQuery.trim()
      ? filterJobsWithFallback(jobs, searchQuery).matchedJobs
      : jobs;

    for (const job of relevantJobs) {
      if (counts[job.platform] !== undefined) {
        counts[job.platform]++;
      }
    }
    return counts;
  }, [jobs, searchQuery]);

  // Saved jobs count (always from full jobs list)
  const savedJobsCount = useMemo(() => {
    return jobs.filter((j) => Boolean(j.saved_status ?? j.is_saved)).length;
  }, [jobs]);

  // Applied jobs count
  const appliedJobsCount = useMemo(() => {
    return jobs.filter((j) => j.applied_status === "applied").length;
  }, [jobs]);

  // Filter pipeline: Tab filter -> Platform filter -> Online search query -> Compact debounced header search
  const { filteredJobs, activeFallbackNotice } = useMemo(() => {
    // 1. Tab filter
    let tabJobs = jobs;
    if (activeTab === "saved") {
      tabJobs = jobs.filter((j) => Boolean(j.saved_status ?? j.is_saved));
    } else if (activeTab === "applied") {
      tabJobs = jobs.filter((j) => j.applied_status === "applied");
    }

    // 2. Platform filter (only in "all" view)
    let platformJobs =
      activeTab === "all"
        ? tabJobs.filter((job) => selectedPlatforms.includes(job.platform))
        : tabJobs;

    // 3. Online query filter if applied
    let noticeMessage: string | null = null;
    if (searchQuery.trim()) {
      const result = filterJobsWithFallback(platformJobs, searchQuery);
      platformJobs = result.matchedJobs;
      noticeMessage = result.isFallback ? result.fallbackMessage ?? null : null;
    }

    // 4. Compact client-side debounced search input (title, company, location, skills)
    if (!debouncedCompactSearch.trim()) {
      return {
        filteredJobs: platformJobs,
        activeFallbackNotice: noticeMessage,
      };
    }

    const term = debouncedCompactSearch.trim().toLowerCase();
    const compactMatched = platformJobs.filter((j) => {
      const matchTitle = (j.title || "").toLowerCase().includes(term);
      const matchCompany = (j.company || "").toLowerCase().includes(term);
      const matchLocation = (j.location || "").toLowerCase().includes(term);
      const matchSkills = (j.tags || []).some((t) =>
        t.toLowerCase().includes(term)
      );
      return matchTitle || matchCompany || matchLocation || matchSkills;
    });

    return {
      filteredJobs: compactMatched,
      activeFallbackNotice: noticeMessage,
    };
  }, [
    jobs,
    selectedPlatforms,
    searchQuery,
    debouncedCompactSearch,
    activeTab,
  ]);

  // Empty state messages per tab
  const emptyStateMessages: Record<
    ViewTab,
    { title: string; subtitle: string }
  > = {
    all: {
      title: "No jobs found",
      subtitle:
        debouncedCompactSearch || searchQuery
          ? `No jobs match "${debouncedCompactSearch || searchQuery}". Try adjusting search.`
          : "No jobs yet. Refresh to fetch new matches.",
    },
    applied: {
      title: "No applied jobs yet",
      subtitle: "Jobs you apply to will appear here.",
    },
    saved: {
      title: "No saved jobs yet",
      subtitle: "Bookmark jobs on the All tab to see them here.",
    },
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* ── 1. Welcome Banner ── */}
      <WelcomeBanner
        userName={userName}
        lastFetchedAt={lastFetchedAt}
        fromCache={fromCache}
        onRefresh={handleRefreshJobs}
        isRefreshing={isRefreshing || loading}
        totalJobs={jobs.length}
      />

      {/* ── 2. Main Layout: Two Column (Content + Right Sidebar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Column: Platform Cards + Tabs + Filter Bar + Top Matches */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6 min-w-0">
          {/* ── Tab Bar: All | Applied | Saved ── */}
          <div
            role="tablist"
            aria-label="Job view filter"
            className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 border border-zinc-200 w-fit"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count =
                tab.id === "saved"
                  ? savedJobsCount
                  : tab.id === "applied"
                  ? appliedJobsCount
                  : jobs.length;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#65a30d] focus-visible:outline-offset-2 ${
                    isActive
                      ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`ml-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#f7fee7] text-[#65a30d]"
                        : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selectable platform cards — only in "All" tab */}
          {activeTab === "all" && (
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              onTogglePlatform={handleTogglePlatform}
              platformCounts={platformCounts}
            />
          )}

          {/* Search Control */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              id="job-search-input"
              type="text"
              placeholder="Search by role (e.g. ML Engineer) or company... Press Enter to fetch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length > 0) {
                  handleRefreshJobs(searchQuery.trim());
                }
              }}
              className="w-full bg-white border border-zinc-200 shadow-2xs rounded-xl pl-9 pr-24 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#84cc16] focus:ring-1 focus:ring-[#84cc16]/30 transition-all"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleRefreshJobs(searchQuery.trim())}
                disabled={isRefreshing}
                className="absolute right-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#84cc16] text-white hover:bg-[#65a30d] transition-all cursor-pointer disabled:opacity-50"
              >
                {isRefreshing ? "Searching..." : "Search"}
              </button>
            )}
          </div>

          {/* Top Job Matches List Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                {activeTab === "saved"
                  ? "Saved Jobs"
                  : activeTab === "applied"
                  ? "Applied Jobs"
                  : "Top Job Matches"}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums bg-[#f7fee7] text-[#65a30d] border border-[#d9f99d]">
                {filteredJobs.length} roles
              </span>
            </div>

            {/* Right: Compact debounced search input + Ranked by match score */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center min-w-[180px] sm:min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  id="section-compact-search"
                  type="text"
                  placeholder="Search jobs..."
                  value={rawCompactSearch}
                  onChange={(e) => setRawCompactSearch(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#84cc16] focus:ring-1 focus:ring-[#84cc16]/30 transition-all"
                />
                {rawCompactSearch && (
                  <button
                    type="button"
                    onClick={() => setRawCompactSearch("")}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {activeTab === "all" && (
                <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 flex-shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ranked by match score</span>
                </div>
              )}
            </div>
          </div>

          {/* Location fallback notice banner */}
          {(activeFallbackNotice || fallbackNotice) && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 shadow-2xs">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{activeFallbackNotice || fallbackNotice}</span>
            </div>
          )}

          {/* Job List / Empty States */}
          <div className="space-y-3">
            {isRefreshing || loading ? (
              <JobsLoadingSkeleton />
            ) : error ? (
              <JobsErrorState
                error={error}
                onRetry={() => handleRefreshJobs()}
              />
            ) : filteredJobs.length === 0 ? (
              /* Per-tab empty state */
              activeTab === "all" ? (
                <JobsEmptyState
                  searchQuery={debouncedCompactSearch || searchQuery.trim()}
                  onSearchOnline={() =>
                    handleRefreshJobs(
                      debouncedCompactSearch.trim() || searchQuery.trim()
                    )
                  }
                  onResetFilters={() => {
                    setSelectedPlatforms(ALL_PLATFORMS);
                    setSearchQuery("");
                    setRawCompactSearch("");
                    setFallbackNotice(null);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-zinc-100">
                    {activeTab === "saved" ? (
                      <Bookmark className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <CheckSquare className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-700">
                    {emptyStateMessages[activeTab].title}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    {emptyStateMessages[activeTab].subtitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className="mt-4 text-xs font-semibold px-4 py-2 rounded-xl bg-[#f7fee7] border border-[#d9f99d] text-[#65a30d] hover:bg-[#ecfccb] transition-colors cursor-pointer"
                  >
                    Browse All Jobs
                  </button>
                </div>
              )
            ) : (
              filteredJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onSaveToggled={handleSaveToggled}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar: Profile Completeness and Recent Activity */}
        <div className="lg:col-span-4 xl:col-span-4">
          <div className="sticky top-6">
            <JobsSidebar
              completenessScore={completenessScore}
              lastFetchedAt={lastFetchedAt}
              savedJobsCount={savedJobsCount}
              totalJobsCount={jobs.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
