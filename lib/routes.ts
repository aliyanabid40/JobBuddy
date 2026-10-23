/**
 * Canonical dashboard routes. Always use these instead of string literals
 * so "Profile" and "Resume" cannot drift apart.
 */
export const ROUTES = {
  dashboard: "/dashboard",
  jobs: "/dashboard/jobs",
  resume: "/dashboard/resume",
  profile: "/dashboard/profile",
  applications: "/dashboard/applications",
  billing: "/dashboard/billing",
  settings: "/dashboard/settings",
} as const;
