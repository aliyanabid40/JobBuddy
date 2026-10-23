"use client";

import React from "react";
import { Sparkles, RefreshCw, Clock } from "lucide-react";

interface WelcomeBannerProps {
  userName?: string;
  lastFetchedAt: string | null;
  fromCache: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalJobs: number;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "Never";
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "Recently";
  }
}

export function WelcomeBanner({
  userName,
  lastFetchedAt,
  fromCache,
  onRefresh,
  isRefreshing,
  totalJobs,
}: WelcomeBannerProps) {
  const displayName = userName ? userName.split(" ")[0] : "Candidate";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 shadow-xs">
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[#f7fee7] text-[#65a30d] border border-[#d9f99d]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Job Discovery Engine • Active</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Welcome back, <span className="text-[#65a30d]">{displayName}</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
            Personalized role matches tailored to your tech stack, experience, and preferred locations.
            {totalJobs > 0 && ` Found ${totalJobs} matching roles.`}
          </p>
        </div>

        {/* Action & Cache status */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2.5 self-stretch sm:self-auto justify-between sm:justify-start pt-2 sm:pt-0 border-t border-zinc-100 sm:border-0">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {fromCache ? "Cached (6h TTL): " : "Updated: "}
              <strong className="text-zinc-700 font-medium">
                {formatTime(lastFetchedAt)}
              </strong>
            </span>
          </div>

          <button
            id="refresh-jobs-cache-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#f7fee7] text-[#65a30d] border border-[#d9f99d] hover:bg-[#ecfccb] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Fetching..." : "Refresh Jobs"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
