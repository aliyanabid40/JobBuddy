"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import type { Job, Platform } from "@/lib/jobs/types";
import { toggleSaveJob } from "@/features/jobs/actions";
import {
  MapPin,
  DollarSign,
  Briefcase,
  Bookmark,
  ExternalLink,
  Award,
} from "lucide-react";

/** Platform display metadata with official logos from /public */
const PLATFORM_META: Record<
  Platform,
  { label: string; logo: string; color: string; bg: string }
> = {
  greenhouse: {
    label: "Greenhouse",
    logo: "/Greenhouse_idSm4tqno2_1.png",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.14)",
  },
  lever: {
    label: "Lever",
    logo: "/Lever.png",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.14)",
  },
  workable: {
    label: "Workable",
    logo: "/Workable_Logo_1.png",
    color: "#00544c",
    bg: "rgba(0,84,76,0.18)",
  },
  wellfound: {
    label: "Wellfound",
    logo: "/Wellfound_idDv186p4l_1.png",
    color: "#f97316",
    bg: "rgba(249,115,22,0.14)",
  },
};

interface JobCardProps {
  job: Job;
  onSaveToggled?: (jobId: string, saved_status: boolean) => void;
}

export function JobCard({ job, onSaveToggled }: JobCardProps) {
  const [isSaved, setIsSaved] = useState(
    Boolean(job.saved_status ?? job.is_saved)
  );
  const [imgError, setImgError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const meta = PLATFORM_META[job.platform] ?? {
    label: job.platform,
    logo: "/Greenhouse_idSm4tqno2_1.png",
    color: "#ACF417",
    bg: "rgba(172,244,23,0.12)",
  };

  const matchPercent = Math.min(Math.max(job.match_score ?? 0, 0), 100);
  const targetUrl = job.job_url || job.url || "#";

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

  // Visual match color
  const matchColor =
    matchPercent >= 80 ? "#ACF417" : matchPercent >= 50 ? "#38bdf8" : "#94a3b8";

  return (
    <article
      className="group relative flex flex-col gap-4.5 rounded-2xl p-5 transition-all duration-200 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-xs"
    >
      {/* ── Top Row: Company Logo, Title, Company, Platform Badge, and Save button ── */}
      <div className="flex items-start justify-between gap-3.5">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Company Logo or Initial Avatar with clean container */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden font-bold text-base bg-zinc-50 border border-zinc-200"
          >
            {job.company_logo && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.company_logo}
                alt={`${job.company} logo`}
                className="w-8 h-8 object-contain rounded-md"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-zinc-700">
                {job.company.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Job Title & Company */}
          <div className="flex-1 min-w-0 space-y-1">
            <h3
              className="font-semibold text-base sm:text-lg text-zinc-900 leading-tight truncate max-w-full"
              title={job.title}
            >
              {job.title}
            </h3>

            <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
              <span className="font-medium text-zinc-700">{job.company}</span>
              <span>•</span>

              {/* Platform Badge with official logo from /public */}
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border border-zinc-200 bg-zinc-50"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0 border border-zinc-100">
                  <Image
                    src={meta.logo}
                    alt={meta.label}
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                </span>
                <span className="text-zinc-700">{meta.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          type="button"
          id={`save-job-btn-${job.id}`}
          onClick={handleSaveToggle}
          disabled={isPending}
          title={isSaved ? "Saved to profile" : "Save job"}
          className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 ${
            isSaved
              ? "bg-[#f7fee7] border border-[#d9f99d] text-[#65a30d]"
              : "bg-zinc-50 border border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-700"
          }`}
        >
          <Bookmark
            className={`w-4 h-4 ${isSaved ? "fill-[#65a30d]" : ""}`}
          />
        </button>
      </div>

      {/* ── Metadata pills: Location, Salary, Job Type, Experience ── */}
      <div className="flex items-center gap-2.5 flex-wrap text-xs text-zinc-600">
        {job.location && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span>{job.location}</span>
          </div>
        )}

        {job.salary && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200">
            <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
            <span>{job.salary}</span>
          </div>
        )}

        {job.job_type && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200">
            <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
            <span>{job.job_type}</span>
          </div>
        )}

        {(job.experience_level || job.level) && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 capitalize">
            <Award className="w-3.5 h-3.5 text-zinc-400" />
            <span>{job.experience_level || job.level}</span>
          </div>
        )}
      </div>

      {/* ── Description snippet ── */}
      {job.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
          {job.description}
        </p>
      )}

      {/* ── Tags List ── */}
      {job.tags && job.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-zinc-100 text-zinc-600 border border-zinc-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Match Score Progress Bar & Action Button ── */}
      <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        {/* Match progress bar */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Match Score</span>
            <span
              className="font-bold tabular-nums text-[#65a30d]"
            >
              {matchPercent}%
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full overflow-hidden bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#84cc16] transition-all duration-700"
              style={{
                width: `${matchPercent}%`,
              }}
            />
          </div>
        </div>

        {/* Apply Now Button (opens job_url in new tab) */}
        <a
          id={`apply-now-btn-${job.id}`}
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex-shrink-0 bg-[#ACF417] text-zinc-950 hover:bg-[#bef264] border border-[#84cc16]/40 shadow-xs"
        >
          <span>Apply Now</span>
          <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
        </a>
      </div>
    </article>
  );
}
