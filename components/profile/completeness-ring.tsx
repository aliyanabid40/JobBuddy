"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, SparklesIcon } from "@hugeicons/core-free-icons";

interface CompletenessRingProps {
  score: number;
}

export function CompletenessRing({ score }: CompletenessRingProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-zinc-900/60 dark:bg-zinc-900/60 border border-zinc-800 shadow-sm backdrop-blur-sm">
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-zinc-800"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-[#ACF417] transition-all duration-1000 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-white tracking-tight">{score}%</span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Ready</span>
        </div>
      </div>

      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ACF417]/15 text-[#ACF417] border border-[#ACF417]/30">
          <HugeiconsIcon icon={score >= 85 ? CheckmarkCircle02Icon : SparklesIcon} size={13} />
          <span>{score >= 85 ? "Profile Highly Optimized" : score >= 50 ? "Good Progress" : "Needs Completion"}</span>
        </div>
        <h4 className="text-sm font-semibold text-zinc-100">AI Application Readiness</h4>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
          {score >= 85
            ? "Your profile has rich details for our AI agent to accurately autofill job application forms."
            : "Add more experiences, skills, and links to maximize your job match score and AI autofill accuracy."}
        </p>
      </div>
    </div>
  );
}
