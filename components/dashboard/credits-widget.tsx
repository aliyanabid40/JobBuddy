"use client";

import Link from "next/link";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Coins01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface CreditsWidgetProps {
  used?: number;
  total?: number;
  planName?: string;
}

export function CreditsWidget({
  used = 2,
  total = 10,
  planName = "Free Plan",
}: CreditsWidgetProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const remaining = Math.max(0, total - used);
  const percentage = Math.min(100, Math.round((remaining / total) * 100));

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/dashboard/billing"
              className="flex size-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-[#ACF417]/50 hover:text-[#ACF417]"
              aria-label="View Credits"
            />
          }
        >
          <div className="relative flex items-center justify-center">
            <HugeiconsIcon icon={Coins01Icon} className="size-5 text-[#ACF417]" strokeWidth={2} />
            <span className="absolute -top-1 -right-1 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ACF417] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#ACF417]" />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <div className="text-xs">
            <p className="font-semibold text-white">{remaining} / {total} Credits Left</p>
            <p className="text-[11px] text-zinc-400">Click to manage billing</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-xl border border-lime-200/90 bg-[#F7FEE7]/80 p-4 transition-all hover:border-lime-300 dark:border-zinc-800/90 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-200">
          <HugeiconsIcon icon={SparklesIcon} className="size-4 text-[#65a30d] dark:text-[#ACF417]" strokeWidth={2} />
          <span>Credits</span>
        </div>
        <span className="rounded-full border border-lime-400/60 bg-lime-200/60 px-2 py-0.5 text-[10px] font-bold text-lime-900 dark:border-[#ACF417]/30 dark:bg-[#ACF417]/15 dark:text-[#ACF417]">
          {planName}
        </span>
      </div>

      <div className="mb-2.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-sm font-bold text-zinc-950 dark:text-white">
            {remaining} / {total}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Daily applies left</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-[#84cc16] dark:bg-[#ACF417] shadow-[0_0_12px_rgba(172,244,23,0.5)] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <Link
        href="/dashboard/billing"
        className="group flex items-center justify-between text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-[#ACF417]"
      >
        <span>Upgrade for more credits</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </Link>
    </div>
  );
}
