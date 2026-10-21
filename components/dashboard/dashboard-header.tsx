"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";
import React from "react";

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview and AI automation status",
  },
  "/dashboard/jobs": {
    title: "Jobs",
    subtitle: "Discover matched jobs and automated applications",
  },
  "/dashboard/resume": {
    title: "Resume",
    subtitle: "Manage and parse your resumes with AI",
  },
  "/dashboard/profile": {
    title: "Profile",
    subtitle: "Your personal, skills, and experience details",
  },
  "/dashboard/applications": {
    title: "Application Status",
    subtitle: "Live status of submitted and queued applications",
  },
  "/dashboard/billing": {
    title: "Billing & Credits",
    subtitle: "Manage your subscription, credits, and invoices",
  },
  "/dashboard/settings": {
    title: "Profile Settings",
    subtitle: "Manage your account preferences and settings",
  },
};

interface DashboardHeaderProps {
  user?: {
    email?: string | null;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useDashboardTheme();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const currentRoute =
    routeTitles[pathname] ??
    Object.entries(routeTitles).find(([key]) => key !== "/dashboard" && pathname.startsWith(key))?.[1] ?? {
      title: "Dashboard",
      subtitle: "JobBuddy AI application platform",
    };

  const email = user?.email ?? "user@jobbuddy.ai";
  const fullName = user?.user_metadata?.full_name ?? email.split("@")[0];
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /** Client-side sign-out: clears Supabase session then hard-redirects to /sign-in */
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Session was already expired — continue with redirect
    } finally {
      // Use router.replace to destroy back-stack and ensure middleware clears the session cookie
      router.replace("/sign-in");
      // Hard reload so Next.js middleware re-evaluates auth state and
      // flushes any stale RSC cache that could cause a hydration mismatch
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 100);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 text-zinc-900 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-100 md:px-6">
      {/* Left: Sidebar Trigger & Page Title */}
      <div className="flex items-center gap-3.5">
        <SidebarTrigger className="size-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-[#ACF417]" />
        <Separator orientation="vertical" className="h-5 bg-zinc-200 dark:bg-zinc-800" />
        <div>
          <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white md:text-lg">
            {currentRoute.title}
          </h1>
        </div>
      </div>

      {/* Right: Agent Status Badge, Theme Toggle, User Info & Sign-Out */}
      <div className="flex items-center gap-2.5">
        {/* AI Agent Status Pulse */}
        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
          <span className="flex size-2 rounded-full bg-[#ACF417] ring-4 ring-[#ACF417]/20 animate-pulse" />
          <span className="text-zinc-800 dark:text-zinc-200">AI Agent Active</span>
        </div>

        {/* Light / Dark Toggle */}
        <button
          type="button"
          id="header-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to white background" : "Switch to black background"}
          title={theme === "dark" ? "Switch to white background" : "Switch to black background"}
          className="flex size-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:border-[#ACF417] hover:text-[#ACF417] dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-[#ACF417] dark:hover:text-[#ACF417] transition-colors"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg border border-[#ACF417]/30 bg-[#ACF417]/15 text-xs font-bold text-[#ACF417]">
              {initials || "JB"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Sign-Out Button — always visible in top-right header */}
        <button
          id="header-sign-out-btn"
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          aria-label="Sign out of JobBuddy"
          title="Sign out"
          className="flex items-center gap-1.5 rounded-lg border border-red-300/40 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:border-red-400/60 hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:border-red-700/60 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        >
          {isSigningOut ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <HugeiconsIcon icon={Logout01Icon} size={14} strokeWidth={2} />
          )}
          <span className="hidden sm:inline">{isSigningOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </header>
  );
}
