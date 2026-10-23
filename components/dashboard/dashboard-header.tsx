"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
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

export function DashboardHeader({ user: _user }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const currentRoute =
    routeTitles[pathname] ??
    Object.entries(routeTitles).find(
      ([key]) => key !== "/dashboard" && pathname.startsWith(key)
    )?.[1] ?? {
      title: "Dashboard",
      subtitle: "JobBuddy AI application platform",
    };

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
      router.replace("/sign-in");
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 100);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 text-zinc-900 md:px-6">
      {/* Left: Sidebar Trigger & Page Title */}
      <div className="flex items-center gap-3.5">
        <SidebarTrigger className="size-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" />
        <Separator orientation="vertical" className="h-5 bg-zinc-200" />
        <div>
          <h1 className="text-base font-bold tracking-tight text-zinc-900 md:text-lg">
            {currentRoute.title}
          </h1>
        </div>
      </div>

      {/* Right: Sign Out only — no AI pill, no avatar */}
      <div className="flex items-center gap-3">
        <button
          id="header-sign-out-btn"
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isSigningOut ? (
            <svg
              className="size-4 animate-spin text-zinc-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={2} />
          )}
          <span>{isSigningOut ? "Signing out…" : "Sign Out"}</span>
        </button>
      </div>
    </header>
  );
}
