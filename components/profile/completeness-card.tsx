"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { DetailedCompleteness } from "@/features/resume/completeness";
import { ROUTES } from "@/lib/routes";

interface CompletenessCardProps {
  details: DetailedCompleteness;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  /** When set, shows an Edit Profile link to the Profile route (not Resume). */
  editHref?: string;
  showHint?: boolean;
}

/** High-score ring/bar fill. Matches Dashboard progress bars (`--accent-lime`). */
function ringStroke(score: number): string {
  if (score >= 75) return "var(--accent-lime)";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function CompletenessRing({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const isLg = size === "lg";
  const box = isLg ? 104 : 80;
  const radius = isLg ? 42 : 40;
  const strokeWidth = isLg ? 8 : 6;
  const cx = box / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: isLg ? 128 : 80, height: isLg ? 128 : 80 }}
    >
      <svg
        width={isLg ? 128 : 80}
        height={isLg ? 128 : 80}
        viewBox={`0 0 ${box} ${box}`}
        className="-rotate-90"
      >
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={ringStroke(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-extrabold tracking-tight tabular-nums text-zinc-900 ${
            isLg ? "text-2xl" : "text-base"
          }`}
        >
          {score}%
        </span>
        {isLg ? (
          <span className="text-[11px] text-zinc-400 font-medium">Complete</span>
        ) : null}
      </div>
    </div>
  );
}

export function CompletenessBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1 w-full rounded-full overflow-hidden bg-zinc-100">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: "var(--accent-lime)",
        }}
      />
    </div>
  );
}

function StatusBadge({ score }: { score: number }) {
  const badgeText =
    score >= 80 ? "Strong profile" : score >= 50 ? "Good start" : "Incomplete";

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: "var(--accent-soft)",
        color: "var(--accent-text)",
        border: "1px solid var(--accent-border)",
      }}
    >
      <HugeiconsIcon
        icon={CheckmarkCircle02Icon}
        size={14}
        color="var(--accent-text)"
      />
      <span>{badgeText}</span>
    </div>
  );
}

export function ProfileCompletenessCard({
  details,
  activeTab,
  onSelectTab,
  editHref,
  showHint = true,
}: CompletenessCardProps) {
  const score = details.overall;

  const sections = [
    { id: "personal", label: "Personal info", value: details.personal },
    { id: "summary", label: "Summary", value: details.summary },
    { id: "skills", label: "Skills", value: details.skills },
    { id: "experience", label: "Experience", value: details.experience },
    { id: "education", label: "Education", value: details.education },
    { id: "projects", label: "Projects", value: details.projects },
    {
      id: "certifications",
      label: "Certifications",
      value: details.certifications,
    },
  ];

  const getHint = () => {
    if (score >= 90) return "Profile is excellent! Ready for top matches.";
    if (score >= 70) return "Add more skills or a project to boost match scores.";
    if (score >= 50) return "Complete your summary and experience sections.";
    return "Upload your resume to auto-fill your profile.";
  };

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sticky top-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-900">
            Profile completeness
          </h3>
          {showHint ? (
            <p className="text-xs text-zinc-500 leading-relaxed">{getHint()}</p>
          ) : (
            <p className="text-xs text-zinc-500 leading-relaxed">
              Almost there — fill in a few more details to stand out.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-1 pb-1">
        <CompletenessRing score={score} size="lg" />
        <div className="mt-4">
          <StatusBadge score={score} />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {sections.map((sec) => {
          const isActive = activeTab === sec.id;
          const clickable = Boolean(onSelectTab);

          const rowClass = `w-full text-left p-1.5 rounded-xl transition-all ${
            clickable ? "cursor-pointer" : ""
          } ${isActive ? "bg-[var(--accent-soft)]" : clickable ? "hover:bg-zinc-50" : ""}`;

          const body = (
            <>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span
                  className={`font-medium ${
                    isActive
                      ? "font-bold"
                      : "text-zinc-700"
                  }`}
                  style={isActive ? { color: "var(--accent-text)" } : undefined}
                >
                  {sec.label}
                </span>
                <span className="text-xs font-semibold text-zinc-600">
                  {sec.value}%
                </span>
              </div>
              <CompletenessBar value={sec.value} />
            </>
          );

          if (clickable) {
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectTab?.(sec.id)}
                className={rowClass}
              >
                {body}
              </button>
            );
          }

          return (
            <div key={sec.id} className={rowClass}>
              {body}
            </div>
          );
        })}
      </div>

      {editHref ? (
        <Link
          id="completeness-edit-profile"
          href={editHref}
          prefetch={false}
          className="block text-xs font-semibold py-2.5 rounded-xl text-center transition-all hover:opacity-90"
          style={{
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent-text)",
          }}
        >
          Edit Profile →
        </Link>
      ) : null}
    </div>
  );
}

export const PROFILE_EDIT_HREF = ROUTES.profile;
