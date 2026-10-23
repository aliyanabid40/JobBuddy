import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

const completeness = {
  overall: 90,
  personal: 100,
  summary: 100,
  skills: 100,
  experience: 96,
  education: 100,
  projects: 60,
  certifications: 75,
};

describe("DashboardOverview actions", () => {
  it("has a single Edit Profile control inside completeness, plus View Jobs", () => {
    render(
      <DashboardOverview
        completeness={completeness}
        stats={{
          jobsFetched: 0,
          lastFetchedAt: null,
          applicationsCount: 0,
          savedJobsCount: 0,
        }}
        userEmail="alex@jobbuddy.ai"
      />
    );

    const editLinks = screen.getAllByRole("link", { name: /edit profile/i });
    expect(editLinks).toHaveLength(1);
    expect(editLinks[0]).toHaveAttribute("href", "/dashboard/profile");
    expect(editLinks[0]).toHaveAttribute("id", "completeness-edit-profile");

    const viewJobs = screen.getByRole("link", { name: /view jobs/i });
    expect(viewJobs).toHaveAttribute("href", "/dashboard/jobs");
    expect(screen.queryByRole("link", { name: /^edit profile$/i })).not.toBeInTheDocument();
  });
});
