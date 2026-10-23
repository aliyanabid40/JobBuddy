"use client";

/**
 * @file components/jobs/jobs-grid.tsx
 * Grid container for job cards with loading skeletons, empty state, and refresh bar.
 */

import React from "react";
import type { Job } from "@/lib/jobs/types";
import { JobCard } from "./job-card";

interface JobsGridProps {
  jobs: Job[];
  loading: boolean;
  error?: string;
  lastFetched: string | null;
  fromCache: boolean;
  onRefresh: () => void;
  onSaveToggled?: (jobId: string, is_saved: boolean) => void;
}

function SkeletonCard() {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-5 animate-pulse"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div
            className="h-3 w-3/4 rounded"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="h-2.5 w-1/2 rounded"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          />
        </div>
        <div
          className="w-10 h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        />
      </div>
      <div className="flex gap-2">
        <div
          className="h-5 w-20 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="h-5 w-16 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
      </div>
      <div className="flex gap-2 mt-2">
        <div
          className="h-8 flex-1 rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="h-8 flex-1 rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="h-8 w-9 rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
      </div>
    </div>
  );
}

function EmptyState({ hasError, error }: { hasError: boolean; error?: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(172,244,23,0.08)", border: "1px solid rgba(172,244,23,0.15)" }}
      >
        {hasError ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ACF417" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        )}
      </div>
      <div className="text-center">
        <p
          className="text-sm font-medium"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {hasError ? "Failed to load jobs" : "No jobs found"}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {hasError
            ? error ?? "An error occurred"
            : "Try adjusting your filters or refreshing the job feed"}
        </p>
      </div>
    </div>
  );
}

/** Format relative time string */
function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function JobsGrid({
  jobs,
  loading,
  error,
  lastFetched,
  fromCache,
  onRefresh,
  onSaveToggled,
}: JobsGridProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* ── Refresh / status bar ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p
          className="text-xs"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-ping"
                style={{ backgroundColor: "#ACF417" }}
              />
              Fetching fresh jobs from Brave...
            </span>
          ) : (
            <>
              Last updated: {formatRelativeTime(lastFetched)}{" "}
              {fromCache && (
                <span style={{ color: "rgba(172,244,23,0.6)" }}>
                  · cached
                </span>
              )}
            </>
          )}
        </p>

        <button
          id="refresh-jobs-btn"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "rgba(172,244,23,0.08)",
            border: "1px solid rgba(172,244,23,0.2)",
            color: "#ACF417",
          }}
          onMouseEnter={(e) => {
            if (!loading)
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(172,244,23,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "rgba(172,244,23,0.08)";
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={loading ? "animate-spin" : ""}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Job card grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : error ? (
          <EmptyState hasError error={error} />
        ) : jobs.length === 0 ? (
          <EmptyState hasError={false} />
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} onSaveToggled={onSaveToggled} />
          ))
        )}
      </div>
    </div>
  );
}
