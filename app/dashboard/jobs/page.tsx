import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { calculateProfileCompleteness } from "@/features/resume/completeness";
import { fetchJobsForUser } from "@/features/jobs/actions";
import { JobsDashboardClient } from "@/components/jobs/jobs-dashboard-client";
import { JobsLoadingSkeleton } from "@/components/jobs/jobs-skeleton";

export const metadata = {
  title: "AI Job Discovery | JobBuddy",
  description:
    "Discover tailored job matches from Greenhouse, Lever, Workable, and Wellfound matched directly to your profile.",
};

export const instant = false;

export default async function JobsPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Load profile sections to compute completeness score
  const [profileRes, skillsRes, expRes, eduRes, projRes, certRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("skills").select("*").eq("user_id", user.id),
      supabase.from("experiences").select("*").eq("user_id", user.id),
      supabase.from("educations").select("*").eq("user_id", user.id),
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("certifications").select("*").eq("user_id", user.id),
    ]);

  const completenessScore = calculateProfileCompleteness({
    profile: profileRes.data ?? undefined,
    skills: skillsRes.data ?? [],
    experiences: expRes.data ?? [],
    educations: eduRes.data ?? [],
    projects: projRes.data ?? [],
    certifications: certRes.data ?? [],
  });

  const userName =
    profileRes.data?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Candidate";

  // Fetch jobs (respects 6-hour cache)
  const jobsResult = await fetchJobsForUser();
  const initialJobs = jobsResult.ok ? jobsResult.jobs : [];
  const initialLastFetchedAt = jobsResult.ok ? jobsResult.lastFetched : null;
  const initialFromCache = jobsResult.ok ? jobsResult.fromCache : false;

  return (
    <Suspense fallback={<JobsLoadingSkeleton />}>
      <JobsDashboardClient
        initialJobs={initialJobs}
        initialLastFetchedAt={initialLastFetchedAt}
        initialFromCache={initialFromCache}
        userName={userName}
        completenessScore={completenessScore}
      />
    </Suspense>
  );
}

