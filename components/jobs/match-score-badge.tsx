"use client";

/**
 * @file components/jobs/match-score-badge.tsx
 * Animated ring + score display for job match percentage.
 * Brand accent: #ACF417 (lime-green signature token)
 */

import React from "react";

interface MatchScoreBadgeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
}

const SIZE_CONFIG = {
  sm: { outer: 40, strokeW: 3, fontSize: "text-[9px]" },
  md: { outer: 52, strokeW: 4, fontSize: "text-[11px]" },
  lg: { outer: 64, strokeW: 5, fontSize: "text-[13px]" },
} as const;

/** Returns the ring color based on score bracket */
function getRingColor(score: number): string {
  if (score >= 80) return "#ACF417"; // brand accent — strong match
  if (score >= 50) return "#f59e0b"; // amber — moderate match
  return "#ef4444";                  // red — weak match
}

/** Returns text color matching ring */
function getScoreTextColor(score: number): string {
  if (score >= 80) return "#ACF417";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function MatchScoreBadge({ score, size = "md" }: MatchScoreBadgeProps) {
  const cfg = SIZE_CONFIG[size];
  const radius = (cfg.outer - cfg.strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clampedScore / 100) * circumference;
  const color = getRingColor(clampedScore);
  const textColor = getScoreTextColor(clampedScore);
  const center = cfg.outer / 2;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: cfg.outer, height: cfg.outer }}
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Match score: ${clampedScore}%`}
    >
      <svg
        width={cfg.outer}
        height={cfg.outer}
        viewBox={`0 0 ${cfg.outer} ${cfg.outer}`}
        className="-rotate-90"
      >
        {/* Track ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={cfg.strokeW}
        />
        {/* Animated progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={cfg.strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)",
            filter: score >= 80 ? `drop-shadow(0 0 4px ${color}80)` : "none",
          }}
        />
      </svg>

      {/* Score label */}
      <span
        className={`absolute font-bold leading-none ${cfg.fontSize}`}
        style={{ color: textColor }}
      >
        {clampedScore}%
      </span>
    </div>
  );
}
