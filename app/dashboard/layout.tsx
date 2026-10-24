import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog";

// This segment reads the session (runtime data), so it is allowed to block.
export const instant = false;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardThemeProvider>
      <SidebarProvider defaultOpen={true}>
        {/* Session/onboarding reads live behind this boundary so the shell can
            stream a skeleton immediately instead of blocking the first paint. */}
        <Suspense fallback={<DashboardShellSkeleton />}>
          <DashboardShell>{children}</DashboardShell>
        </Suspense>
      </SidebarProvider>
    </DashboardThemeProvider>
  );
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guards /dashboard, but keep defense in depth
  if (!user) {
    redirect("/login");
  }

  // Check onboarding status
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_done")
    .eq("id", user.id)
    .maybeSingle();

  const isOnboarded = Boolean(profile?.onboarding_done);

  return (
    <>
      <AppSidebar user={user} />
      <SidebarInset className="min-h-screen bg-white text-zinc-900 flex flex-col">
        <DashboardHeader user={user} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-white text-zinc-900">
          {children}
        </main>
      </SidebarInset>
      <OnboardingDialog initialOnboardingDone={isOnboarded} />
    </>
  );
}

function DashboardShellSkeleton() {
  return (
    <>
      <div className="hidden md:block w-64 shrink-0 border-r border-zinc-200 bg-zinc-50" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-zinc-200 px-4 flex items-center">
          <div className="h-4 w-32 rounded bg-zinc-200 animate-pulse" />
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="h-8 w-56 rounded bg-zinc-200 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-zinc-100 animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-zinc-100 animate-pulse" />
        </div>
      </div>
    </>
  );
}
