import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already handles the redirect, but double-guard here too
  if (!user) redirect("/sign-in");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center max-w-md w-full mx-4">
      <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30 mx-auto">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome to JobBuddy</h1>
      <p className="text-white/50 text-sm mb-2">
        Signed in as <span className="text-violet-400">{user.email}</span>
      </p>
      <p className="text-white/30 text-xs mb-8">
        Phase 3 — Dashboard layout coming next.
      </p>
      <form action={signOut}>
        <button
          id="signout-btn"
          type="submit"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0f] text-white">
      <Suspense
        fallback={
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center max-w-md w-full mx-4 animate-pulse">
            <div className="w-14 h-14 rounded-xl bg-white/10 mx-auto mb-4" />
            <div className="h-6 w-48 bg-white/10 mx-auto rounded mb-2" />
            <div className="h-4 w-32 bg-white/10 mx-auto rounded" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
