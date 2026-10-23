"use client";

import React from "react";
import Image from "next/image";
import type { Platform } from "@/lib/jobs/types";
import { Check } from "lucide-react";

interface PlatformConfig {
  id: Platform;
  name: string;
  tagline: string;
  logo: string;
  accentColor: string;
  domain: string;
  logoHeight: number;
}

export const PLATFORM_LOGOS: Record<Platform, string> = {
  greenhouse: "/Greenhouse_idSm4tqno2_1.png",
  lever: "/Lever.png",
  workable: "/Workable_Logo_1.png",
  wellfound: "/Wellfound_idDv186p4l_1.png",
};

const PLATFORMS: PlatformConfig[] = [
  {
    id: "greenhouse",
    name: "Greenhouse",
    tagline: "High-growth tech & enterprise",
    logo: "/Greenhouse_idSm4tqno2_1.png",
    accentColor: "#22c55e",
    domain: "greenhouse.io",
    logoHeight: 34,
  },
  {
    id: "lever",
    name: "Lever",
    tagline: "Fast-scaling tech startups",
    logo: "/Lever.png",
    accentColor: "#3b82f6",
    domain: "lever.co",
    logoHeight: 24,
  },
  {
    id: "workable",
    name: "Workable",
    tagline: "Global innovators & scale-ups",
    logo: "/Workable_Logo_1.png",
    accentColor: "#00544c",
    domain: "workable.com",
    logoHeight: 22,
  },
  {
    id: "wellfound",
    name: "Wellfound",
    tagline: "Top seed & series A-D startups",
    logo: "/Wellfound_idDv186p4l_1.png",
    accentColor: "#f97316",
    domain: "wellfound.com",
    logoHeight: 20,
  },
];

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onTogglePlatform: (platform: Platform) => void;
  platformCounts?: Record<Platform, number>;
}

export function PlatformSelector({
  selectedPlatforms,
  onTogglePlatform,
  platformCounts = {
    greenhouse: 0,
    lever: 0,
    workable: 0,
    wellfound: 0,
  },
}: PlatformSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Job Board Platforms
        </h2>
        <span className="text-[11px] text-zinc-400">
          Filter by target ATS & job boards
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const count = platformCounts[platform.id] ?? 0;

          return (
            <button
              key={platform.id}
              type="button"
              id={`platform-card-${platform.id}`}
              onClick={() => onTogglePlatform(platform.id)}
              className={`group relative box-border flex flex-col justify-between p-3.5 rounded-2xl text-left cursor-pointer transition-all duration-150 ease-in-out border ${
                isSelected
                  ? "border-[#BBF7D0] bg-[#F7FEF9] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "border-[#E5E7EB] bg-white hover:border-zinc-300 shadow-none"
              }`}
            >
              {/* Top row: Platform Logo in clean white container + Checkbox indicator */}
              <div className="flex items-center justify-between gap-2 w-full mb-3">
                {/* Logo showcase container */}
                <div className="h-10 px-3 py-1.5 rounded-xl bg-white border border-zinc-100 flex items-center justify-center flex-1 max-w-[130px] shadow-2xs">
                  <Image
                    src={platform.logo}
                    alt={`${platform.name} logo`}
                    width={110}
                    height={platform.logoHeight}
                    className="max-h-7 w-auto object-contain"
                    priority
                  />
                </div>

                {/* Checkbox circle in top-right corner */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    isSelected
                      ? "bg-[#16a34a] text-white"
                      : "border border-zinc-300 bg-white"
                  }`}
                  /* Brand accent token reference: #ACF417 */
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </div>
              </div>

              {/* Title, Job Count, and Domain Tagline */}
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm text-zinc-900">
                    {platform.name}
                  </span>
                  <span
                    className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md border ${
                      isSelected
                        ? "bg-[#f0fdf4] text-[#15803d] border-[#dcfce7]"
                        : "bg-[#F3F4F6] text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {count} {count === 1 ? "job" : "jobs"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-1">
                  {platform.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
