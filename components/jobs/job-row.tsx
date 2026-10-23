"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import type { Job, Platform } from "@/lib/jobs/types";
import { toggleSaveJob } from "@/features/jobs/actions";
import { CompanyLogo } from "./company-logo";
import {
  cleanJobTitle,
  normalizeWorkMode,
  normalizeSeniorityLevel,
  cleanLocation,
  cleanSalary,
  formatPostedRelativeDate,
  cleanSkillTags,
} from "@/lib/jobs/cleaner";
import {
  MapPin,
  DollarSign,
  Briefcase,
  Award,
  Bookmark,
  ExternalLink,
  Clock,
} from "lucide-react";

/** Platform display metadata with official logos from /public */
const PLATFORM_META: Record<
  Platform,
  { label: string; logo: string }
> = {
  greenhouse: {
    label: "Greenhouse",
    logo: "/Greenhouse_idSm4tqno2_1.png",
  },
  lever: {
    label: "Lever",
    logo: "/Lever.png",
  },
  workable: {
    label: "Workable",
    logo: "/Workable_Logo_1.png",
  },
  wellfound: {
    label: "Wellfound",
    logo: "/Wellfound_idDv186p4l_1.png",
  },
};

interface JobRowProps {
  job: Job;
  onSaveToggled?: (jobId: string, saved_status: boolean) => void;
}

export function JobRow({ job, onSaveToggled }: JobRowProps) {
  const [isSaved, setIsSaved] = useState(
    Boolean(job.saved_status ?? job.is_saved)
  );
  const [isPending, startTransition] = useTransition();

  const platformInfo = PLATFORM_META[job.platform] ?? {
    label: job.platform,
    logo: "/Greenhouse_idSm4tqno2_1.png",
  };

  const titleText = cleanJobTitle(job.title, job.company, job.description);

  const workMode = normalizeWorkMode(job.job_type, job.location, job.description);
  const seniority = normalizeSeniorityLevel(job.experience_level || job.level, job.title);
  const locationText = cleanLocation(job.location, workMode);
  const salaryText = cleanSalary(job.salary);
  const relativeTime = formatPostedRelativeDate(job.posted_at);
  const cleanedSkills = cleanSkillTags(job.tags);

  const matchPercent = Math.min(Math.max(job.match_score ?? 0, 0), 100);
  const targetUrl = job.job_url || job.source_url || job.url || "#";

  // Tier color and label logic
  let tierLabel = "Potential match";
  let tierColor = "#ea580c"; // amber/orange
  let progressBg = "#ea580c";

  if (matchPercent >= 90) {
    tierLabel = "Excellent match";
    tierColor = "#65a30d"; // accent green
    progressBg = "#84cc16";
  } else if (matchPercent >= 80) {
    tierLabel = "Strong match";
    tierColor = "#65a30d"; // accent green
    progressBg = "#84cc16";
  } else if (matchPercent >= 70) {
    tierLabel = "Fair match";
    tierColor = "#d97706"; // amber
    progressBg = "#f59e0b";
  }

  function handleSaveToggle() {
    startTransition(async () => {
      const nextState = !isSaved;
      setIsSaved(nextState);

      const result = await toggleSaveJob(job.id);
      if (result.ok && result.saved_status !== undefined) {
        setIsSaved(result.saved_status);
        onSaveToggled?.(job.id, result.saved_status);
      } else {
        setIsSaved(!nextState);
      }
    });
  }

  return (
    <article className="group relative rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 p-4 sm:p-5 transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left & Middle Zone Container */}
        <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
          {/* Left Zone: Company Logo */}
          <CompanyLogo
            company={job.company}
            logoUrl={job.company_logo}
          />

          {/* Middle Zone: Job Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: Company name + Platform Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-zinc-900 text-sm sm:text-base leading-tight">
                {job.company}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-700">
                <span className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-zinc-100 p-0.5">
                  <Image
                    src={platformInfo.logo}
                    alt={platformInfo.label}
                    width={12}
                    height={12}
                    className="object-contain"
                  />
                </span>
                <span>{platformInfo.label}</span>
              </span>
            </div>

            {/* Row 2: Job title (hidden when no real role title could be derived) */}
            {titleText && (
              <div
                className="text-zinc-500 text-xs sm:text-sm font-medium truncate"
                title={titleText}
              >
                {titleText}
              </div>
            )}

            {/* Row 3: Meta Items (Work mode, Seniority, Location, Salary) */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs text-zinc-500 flex-wrap pt-0.5">
              {/* Work mode */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span>{workMode}</span>
              </div>

              {/* Seniority */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                <span>{seniority}</span>
              </div>

              {/* Location (if clean & not duplicated) */}
              {locationText && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{locationText}</span>
                </div>
              )}

              {/* Salary (ONLY if real exact original salary exists) */}
              {salaryText && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 font-medium text-[11px] flex-shrink-0">
                  <DollarSign className="w-3 h-3 text-zinc-500" />
                  <span>{salaryText}</span>
                </div>
              )}
            </div>

            {/* Row 4: Skill Chips (Max 3 then +N) */}
            {cleanedSkills.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {cleanedSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-md px-2 py-0.5 font-mono"
                  >
                    {skill}
                  </span>
                ))}
                {cleanedSkills.length > 3 && (
                  <span className="text-[11px] bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-md px-1.5 py-0.5 font-mono">
                    +{cleanedSkills.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Zone Container: Match Info & Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t border-zinc-100 lg:border-0">
          
          {/* Right Zone A: Match Info */}
          <div className="w-full sm:w-[180px] lg:w-[190px] space-y-1 flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sm" style={{ color: tierColor }}>
                {matchPercent}% Match
              </span>
            </div>

            {/* Thin progress bar (~4-6px) */}
            <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${matchPercent}%`,
                  backgroundColor: progressBg,
                }}
              />
            </div>

            {/* Tier label under bar */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold" style={{ color: tierColor }}>
                {tierLabel}
              </span>
            </div>

            {/* Clock icon + relative posted time */}
            {relativeTime && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 pt-0.5">
                <Clock className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                <span>Posted {relativeTime}</span>
              </div>
            )}
          </div>

          {/* Right Zone B: Actions (Apply Now + Save) */}
          <div className="flex sm:flex-col items-center gap-2 w-full sm:w-[140px] flex-shrink-0">
            {/* Apply Now button */}
            <a
              id={`apply-now-btn-${job.id}`}
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none w-full h-9 sm:h-10 px-3.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 bg-[#ACF417] text-zinc-950 hover:bg-[#bef264] border border-[#84cc16]/40 shadow-xs"
            >
              <span>Apply Now</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>

            {/* Save button */}
            <button
              type="button"
              id={`save-job-btn-${job.id}`}
              onClick={handleSaveToggle}
              disabled={isPending}
              className={`flex-1 sm:flex-none w-full h-9 sm:h-10 px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                isSaved
                  ? "bg-[#f7fee7] border border-[#d9f99d] text-[#65a30d]"
                  : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isSaved ? "fill-[#65a30d] text-[#65a30d]" : "text-zinc-500"
                }`}
              />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>

        </div>

      </div>
    </article>
  );
}
