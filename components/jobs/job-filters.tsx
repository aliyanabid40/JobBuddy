"use client";

/**
 * @file components/jobs/job-filters.tsx
 * Platform filter tabs + search input + match score slider.
 * Brand accent #ACF417 applied to active tab states.
 */

import React from "react";
import type { JobFilters, Platform } from "@/lib/jobs/types";

const PLATFORMS: { value: Platform | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "workable", label: "Workable" },
  { value: "wellfound", label: "Wellfound" },
];

/** Platform badge color map */
const PLATFORM_COLORS: Record<Platform | "all", string> = {
  all: "#ACF417",
  greenhouse: "#22c55e",
  lever: "#3b82f6",
  workable: "#8b5cf6",
  wellfound: "#f97316",
};

interface JobFiltersProps {
  filters: JobFilters;
  onFiltersChange: (updated: Partial<JobFilters>) => void;
  totalCount: number;
  loading?: boolean;
}

export function JobFilters({
  filters,
  onFiltersChange,
  totalCount,
  loading = false,
}: JobFiltersProps) {
  const activePlatform = filters.platform ?? "all";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Platform Tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {PLATFORMS.map(({ value, label }) => {
          const isActive = activePlatform === value;
          const accentColor = isActive ? "#ACF417" : "transparent";

          return (
            <button
              key={value}
              id={`platform-filter-${value}`}
              onClick={() => onFiltersChange({ platform: value })}
              disabled={loading}
              className="relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: isActive ? "#ACF417" : "rgba(255,255,255,0.12)",
                backgroundColor: isActive
                  ? "rgba(172,244,23,0.1)"
                  : "rgba(255,255,255,0.04)",
                color: isActive ? "#ACF417" : "rgba(255,255,255,0.6)",
                boxShadow: isActive
                  ? "0 0 12px rgba(172,244,23,0.2)"
                  : "none",
              }}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 align-middle"
                  style={{ backgroundColor: accentColor }}
                />
              )}
              {label}
            </button>
          );
        })}

        {/* Total count badge */}
        <span
          className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            backgroundColor: "rgba(172,244,23,0.1)",
            color: "#ACF417",
            border: "1px solid rgba(172,244,23,0.2)",
          }}
        >
          {loading ? "..." : `${totalCount} jobs`}
        </span>
      </div>

      {/* ── Search + Slider row ─────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "rgba(255,255,255,0.35)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            id="job-search-input"
            type="text"
            placeholder="Search by title or company..."
            value={filters.search ?? ""}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all duration-200"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.9)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(172,244,23,0.4)";
              e.currentTarget.style.boxShadow =
                "0 0 0 2px rgba(172,244,23,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Min match % slider */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Min match:
          </span>
          <input
            id="match-score-slider"
            type="range"
            min={0}
            max={100}
            step={10}
            value={filters.minMatchScore ?? 0}
            onChange={(e) =>
              onFiltersChange({ minMatchScore: Number(e.target.value) })
            }
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={
              {
                background: `linear-gradient(to right, #ACF417 0%, #ACF417 ${filters.minMatchScore ?? 0}%, rgba(255,255,255,0.15) ${filters.minMatchScore ?? 0}%, rgba(255,255,255,0.15) 100%)`,
                accentColor: "#ACF417",
              } as React.CSSProperties
            }
          />
          <span
            className="text-xs font-medium w-8 text-right tabular-nums"
            style={{ color: "#ACF417" }}
          >
            {filters.minMatchScore ?? 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
