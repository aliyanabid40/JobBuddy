"use client";

import React from "react";
import { AlertCircle, SearchX, RefreshCw } from "lucide-react";

export function JobsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-5 border border-zinc-200 bg-white shadow-2xs animate-pulse space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 flex-1">
              <div className="w-12 h-12 rounded-xl bg-zinc-100" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-zinc-200 rounded w-2/3" />
                <div className="h-3 bg-zinc-100 rounded w-1/3" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-zinc-100" />
          </div>

          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-lg bg-zinc-100" />
            <div className="h-6 w-24 rounded-lg bg-zinc-100" />
            <div className="h-6 w-16 rounded-lg bg-zinc-100" />
          </div>

          <div className="h-3 bg-zinc-100 rounded w-full" />
          <div className="h-3 bg-zinc-100 rounded w-4/5" />

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-4">
            <div className="h-2 rounded-full bg-zinc-100 flex-1" />
            <div className="h-8 w-24 rounded-xl bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface JobsEmptyStateProps {
  onResetFilters?: () => void;
  onSearchOnline?: () => void;
  searchQuery?: string;
  message?: string;
}

export function JobsEmptyState({
  onResetFilters,
  onSearchOnline,
  searchQuery,
  message = "No matching jobs found for the selected platforms or filters.",
}: JobsEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900">No jobs found</h3>
      <p className="text-xs text-zinc-500 max-w-sm">{message}</p>
      <div className="flex items-center gap-2 mt-2">
        {searchQuery && onSearchOnline && (
          <button
            type="button"
            onClick={onSearchOnline}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-[#84cc16] text-white hover:bg-[#65a30d] shadow-2xs"
          >
            Search &quot;{searchQuery}&quot; online
          </button>
        )}
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-[#f7fee7] text-[#65a30d] border border-[#d9f99d] hover:bg-[#ecfccb]"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}

interface JobsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function JobsErrorState({ error, onRetry }: JobsErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-500">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900">
        Unable to load jobs
      </h3>
      <p className="text-xs text-red-600 max-w-md">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all bg-[#ACF417] text-zinc-950 hover:bg-[#bef264] shadow-xs"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
