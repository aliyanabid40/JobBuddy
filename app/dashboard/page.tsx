import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDetailedCompleteness } from "@/features/resume/completeness";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Load profile + all sections for completeness calculation + job stats
  const [
    profileRes,
    skillsRes,
    expRes,
    eduRes,
    projRes,
    certRes,
    fetchLogRes,
    savedJobsRes,
    appliedJobsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("skills").select("*").eq("user_id", user.id),
    supabase.from("experiences").select("*").eq("user_id", user.id),
    supabase.from("educations").select("*").eq("user_id", user.id),
    supabase.from("projects").select("*").eq("user_id", user.id),
    supabase.from("certifications").select("*").eq("user_id", user.id),
    supabase
      .from("job_fetch_log")
      .select("last_fetched_at, job_count")
      .eq("user_id", user.id)
      .maybeSingle(),
    // Count saved jobs from jobs_cache
    supabase
      .from("jobs_cache")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("saved_status", true),
    // Count applied jobs from jobs_cache
    supabase
      .from("jobs_cache")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("applied_status", "applied"),
  ]);

  const completeness = calculateDetailedCompleteness({
    profile: profileRes.data ?? undefined,
    skills: skillsRes.data ?? [],
    experiences: expRes.data ?? [],
    educations: eduRes.data ?? [],
    projects: projRes.data ?? [],
    certifications: certRes.data ?? [],
  });

  const stats = {
    jobsFetched: fetchLogRes.data?.job_count ?? 0,
    lastFetchedAt: fetchLogRes.data?.last_fetched_at ?? null,
    applicationsCount: appliedJobsRes.count ?? 0,
    savedJobsCount: savedJobsRes.count ?? 0,
  };

  return (
    <DashboardOverview
      completeness={completeness}
      stats={stats}
      userEmail={user.email ?? ""}
    />
  );
}
