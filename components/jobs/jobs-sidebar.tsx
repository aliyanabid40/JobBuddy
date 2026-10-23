"use client";

import React from "react";
import Link from "next/link";
import { UserCheck, Sparkles, Clock, Bookmark, ArrowUpRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";

interface JobsSidebarProps {
  completenessScore: number;
  lastFetchedAt: string | null;
  savedJobsCount: number;
  totalJobsCount: number;
}

function formatRelativeTime(isoString: string | null): string {
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
    return "recently";
  }
}

export function JobsSidebar({
  completenessScore = 85,
  lastFetchedAt,
  savedJobsCount = 0,
  totalJobsCount = 0,
}: JobsSidebarProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (completenessScore / 100) * circumference;
  const color =
    completenessScore >= 80
      ? "var(--accent-lime)"
      : completenessScore >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <aside className="space-y-5 w-full">
      {/* ── 1. Profile Completeness Widget ── */}
      <div className="rounded-2xl p-5 space-y-4 bg-white border border-zinc-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Profile Completeness
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Affects job match accuracy
            </p>
          </div>

          {/* SVG Ring with green accent branding token */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 72, height: 72 }}
          >
            <svg
              width={72}
              height={72}
              viewBox="0 0 72 72"
              className="-rotate-90"
            >
              <circle
                cx={36}
                cy={36}
                r={radius}
                fill="none"
                stroke="#f4f4f5"
                strokeWidth={5}
              />
              <circle
                cx={36}
                cy={36}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </svg>
            <span
              className="absolute text-sm font-bold tabular-nums text-zinc-900"
            >
              {completenessScore}%
            </span>
          </div>
        </div>

        {/* Breakdown sub-bars */}
        <div className="space-y-2 pt-1 border-t border-zinc-100">
          {[
            { label: "Profile & Role", pct: Math.min(completenessScore + 10, 100) },
            { label: "Skills & Tech", pct: completenessScore },
            { label: "Experience", pct: Math.max(completenessScore - 10, 0) },
            { label: "Education", pct: Math.max(completenessScore - 5, 0) },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{item.label}</span>
                <span className="tabular-nums font-medium text-zinc-700">
                  {item.pct}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.pct}%`,
                    backgroundColor: "var(--accent-lime)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <Link
          href={ROUTES.profile}
          prefetch={false}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-center transition-all duration-200 cursor-pointer bg-[#f7fee7] border border-[#d9f99d] text-[#65a30d] hover:bg-[#ecfccb]"
        >
          <span>Enhance Profile</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── 2. Recent Activity Widget ── */}
      <div className="rounded-2xl p-5 space-y-4 bg-white border border-zinc-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Recent Activity
          </h3>
          <span className="text-[10px] text-zinc-400">Live feed</span>
        </div>

        <div className="space-y-3">
          {/* Feed item: jobs cache */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#f7fee7] text-[#65a30d]">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-800 leading-snug font-medium">
                {totalJobsCount > 0
                  ? `${totalJobsCount} jobs synced from platforms`
                  : "Jobs cache ready"}
              </p>
              <span className="text-[10px] text-zinc-400">
                {formatRelativeTime(lastFetchedAt)}
              </span>
            </div>
          </div>

          {/* Feed item: saved jobs */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-50 text-blue-600">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-800 leading-snug font-medium">
                {savedJobsCount > 0
                  ? `${savedJobsCount} positions saved to list`
                  : "Bookmark jobs to track them"}
              </p>
              <span className="text-[10px] text-zinc-400">Profile sync</span>
            </div>
          </div>

          {/* Feed item: AI Agent */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-purple-50 text-purple-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-800 leading-snug font-medium">
                AI Auto-Fill & Submission engine
              </p>
              <span className="text-[10px] text-zinc-400">
                Phase 6 integration
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
