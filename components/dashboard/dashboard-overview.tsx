"use client";

/**
 * @file components/dashboard/dashboard-overview.tsx
 * Phase 5 Dashboard Home — Completeness card, Recent Activity, Quick Stats.
 * Light-theme dashboard home. Brand lime accent.
 */

import React from "react";
import Link from "next/link";
import { ProfileCompletenessCard } from "@/components/profile/completeness-card";
import { DetailedCompleteness } from "@/features/resume/completeness";
import { ROUTES } from "@/lib/routes";

interface DashboardOverviewProps {
  completeness: DetailedCompleteness;
  stats: {
    jobsFetched: number;
    lastFetchedAt: string | null;
    applicationsCount: number;
    savedJobsCount: number;
  };
  userEmail: string;
}

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

function QuickStatsCard({
  jobsFetched,
  applicationsCount,
  savedJobsCount,
}: {
  jobsFetched: number;
  applicationsCount: number;
  savedJobsCount: number;
}) {
  const stats = [
    {
      id: "stat-jobs",
      label: "Jobs Found",
      value: jobsFetched,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ACF417" strokeWidth="1.8">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      ),
      href: "/dashboard/jobs?view=all",
      color: "#ACF417",
    },
    {
      id: "stat-applied",
      label: "Applied",
      value: applicationsCount,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      href: "/dashboard/jobs?view=applied",
      color: "#3b82f6",
    },
    {
      id: "stat-saved",
      label: "Saved",
      value: savedJobsCount,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      href: "/dashboard/jobs?view=saved",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="rounded-2xl p-6 bg-white border border-zinc-200 shadow-2xs">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4 text-zinc-500">
        Quick Stats
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ id, label, value, icon, href, color }) => (
          <Link
            key={id}
            id={id}
            href={href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 text-center group bg-zinc-50 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100"
          >
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15` }}>
              {icon}
            </div>
            <span className="text-2xl font-bold tabular-nums text-zinc-900">
              {value}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RecentActivityCard({
  jobsFetched,
  lastFetchedAt,
}: {
  jobsFetched: number;
  lastFetchedAt: string | null;
}) {
  const activities = [
    lastFetchedAt
      ? {
          id: "act-jobs",
          text: `${jobsFetched} jobs fetched`,
          time: formatRelativeTime(lastFetchedAt),
          color: "#65a30d",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          ),
        }
      : null,
    {
      id: "act-profile",
      text: "Profile setup in progress",
      time: "ongoing",
      color: "#8b5cf6",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: "act-ai",
      text: "AI Apply coming in Phase 6",
      time: "upcoming",
      color: "#3b82f6",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="rounded-2xl p-6 bg-white border border-zinc-200 shadow-2xs">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4 text-zinc-500">
        Recent Activity
      </h2>
      <div className="flex flex-col gap-3">
        {activities.map((act) => (
          <div key={act!.id} id={act!.id} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${act!.color}18`,
                color: act!.color,
              }}
            >
              {act!.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-700">
                {act!.text}
              </p>
            </div>
            <span className="text-[10px] flex-shrink-0 text-zinc-400">
              {act!.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardOverview({
  completeness,
  stats,
  userEmail,
}: DashboardOverviewProps) {
  return (
    <div className="flex flex-col gap-6 max-w-screen-xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="text-sm mt-1 text-zinc-500">
          {userEmail}
        </p>
      </div>

      {/* 3-col grid on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Completeness — spans 1 col */}
        <ProfileCompletenessCard
          details={completeness}
          editHref={ROUTES.profile}
        />

        {/* Stats + Activity — span 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <QuickStatsCard
            jobsFetched={stats.jobsFetched}
            applicationsCount={stats.applicationsCount}
            savedJobsCount={stats.savedJobsCount}
          />
          <RecentActivityCard
            jobsFetched={stats.jobsFetched}
            lastFetchedAt={stats.lastFetchedAt}
          />
        </div>
      </div>

      <Link
        id="cta-view-jobs"
        href={ROUTES.jobs}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-[#ACF417] text-zinc-950 hover:bg-[#bef264] border border-[#84cc16]/40 shadow-xs w-fit"
      >
        View Jobs →
      </Link>
    </div>
  );
}
