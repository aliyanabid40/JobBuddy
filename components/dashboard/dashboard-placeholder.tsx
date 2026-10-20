import { HugeiconsIcon } from "@hugeicons/react";

interface DashboardPlaceholderProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
}

export function DashboardPlaceholder({ title, icon }: DashboardPlaceholderProps) {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 md:p-12 transition-colors">
      {icon && (
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-lime-400/50 bg-[#EAFCC7] text-lime-800 shadow-[0_0_20px_rgba(172,244,23,0.15)] dark:border-[#ACF417]/30 dark:bg-zinc-900 dark:text-[#ACF417]">
          <HugeiconsIcon icon={icon} className="size-7" strokeWidth={2} />
        </div>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white mb-3">
        {title}
      </h2>
      <div className="max-w-md rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800/90 dark:bg-zinc-900/50">
        <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
          Main Content Area - Keep blank for now. Pages will render here later based on navigation.
        </p>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        <span className="size-1.5 rounded-full bg-[#84cc16] dark:bg-[#ACF417]" />
        <span>Chapter 3 — Dashboard Shell Active</span>
      </div>
    </div>
  );
}
