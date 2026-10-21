"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { DetailedCompleteness } from "@/features/resume/completeness";

interface CompletenessCardProps {
  details: DetailedCompleteness;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function ProfileCompletenessCard({
  details,
  activeTab,
  onSelectTab,
}: CompletenessCardProps) {
  const score = details.overall;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  // Determine dynamic ring color and badge label based on overall score
  const ringColor = score >= 75 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
  const badgeText = score >= 80 ? "Strong profile" : score >= 50 ? "Good start" : "Incomplete";

  const sections = [
    { id: "personal", label: "Personal info", value: details.personal },
    { id: "summary", label: "Summary", value: details.summary },
    { id: "skills", label: "Skills", value: details.skills },
    { id: "experience", label: "Experience", value: details.experience },
    { id: "education", label: "Education", value: details.education },
    { id: "projects", label: "Projects", value: details.projects },
    { id: "certifications", label: "Certifications", value: details.certifications },
  ];

  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 shadow-sm sticky top-6 space-y-6">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Profile completeness
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Almost there — fill in a few more details to stand out.
        </p>
      </div>

      {/* Circular Progress Gauge */}
      <div className="flex flex-col items-center justify-center pt-1 pb-3">
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 104 104">
            {/* Background ring */}
            <circle
              cx="52"
              cy="52"
              r={radius}
              className="stroke-zinc-100 dark:stroke-zinc-800"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Dynamic Progress ring */}
            <circle
              cx="52"
              cy="52"
              r={radius}
              stroke={ringColor}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {score}%
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              Complete
            </span>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
          <span>{badgeText}</span>
        </div>
      </div>

      {/* Breakdown Progress Bars */}
      <div className="space-y-3 pt-2">
        {sections.map((sec) => {
          const isActive = activeTab === sec.id;
          const barColor =
            sec.value >= 80 ? "bg-emerald-500" : sec.value >= 40 ? "bg-lime-500" : "bg-amber-500";

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectTab && onSelectTab(sec.id)}
              className={`w-full text-left p-1.5 rounded-xl transition-all cursor-pointer group ${
                isActive ? "bg-zinc-100 dark:bg-zinc-800/70" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              }`}
            >
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span
                  className={`font-medium transition-colors ${
                    isActive
                      ? "text-zinc-900 dark:text-zinc-100 font-bold"
                      : "text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                  }`}
                >
                  {sec.label}
                </span>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {sec.value}%
                </span>
              </div>
              {/* Progress bar line */}
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${sec.value}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
