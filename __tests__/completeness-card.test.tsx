import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileCompletenessCard } from "@/components/profile/completeness-card";

describe("ProfileCompletenessCard Component", () => {
  it("renders with red color scheme when overall score < 40%", () => {
    const details = {
      overall: 25,
      personal: 60,
      summary: 0,
      skills: 0,
      experience: 0,
      education: 0,
      projects: 0,
      certifications: 0,
    };

    const { container } = render(<ProfileCompletenessCard details={details} />);

    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
    expect(screen.getByText("Personal info")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();

    const circle = container.querySelector('circle[stroke="#ef4444"]');
    expect(circle).toBeInTheDocument();
  });

  it("renders with amber color scheme when overall score is between 40% and 74%", () => {
    const details = {
      overall: 55,
      personal: 100,
      summary: 75,
      skills: 60,
      experience: 0,
      education: 0,
      projects: 0,
      certifications: 0,
    };

    const { container } = render(<ProfileCompletenessCard details={details} />);

    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("Good start")).toBeInTheDocument();

    const circle = container.querySelector('circle[stroke="#f59e0b"]');
    expect(circle).toBeInTheDocument();
  });

  it("renders with lime accent token when score >= 75%", () => {
    const details = {
      overall: 90,
      personal: 100,
      summary: 100,
      skills: 100,
      experience: 96,
      education: 100,
      projects: 60,
      certifications: 75,
    };

    const { container } = render(<ProfileCompletenessCard details={details} />);

    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("Strong profile")).toBeInTheDocument();
    expect(screen.getByText("96%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();

    const circle = container.querySelector('circle[stroke="var(--accent-lime)"]');
    expect(circle).toBeInTheDocument();

    const bars = container.querySelectorAll("div.h-1 div.h-full.rounded-full");
    expect(bars.length).toBe(7);
    bars.forEach((bar) => {
      expect(bar.getAttribute("style") ?? "").toContain("--accent-lime");
    });
  });

  it("Edit Profile link points at the Profile route, not Resume", () => {
    const details = {
      overall: 80,
      personal: 100,
      summary: 100,
      skills: 80,
      experience: 90,
      education: 100,
      projects: 60,
      certifications: 0,
    };

    render(
      <ProfileCompletenessCard
        details={details}
        editHref="/dashboard/profile"
      />
    );

    const link = screen.getByRole("link", { name: /edit profile/i });
    expect(link).toHaveAttribute("href", "/dashboard/profile");
    expect(link).not.toHaveAttribute("href", "/dashboard/resume");
  });

  it("triggers onSelectTab when a section progress bar is clicked", () => {
    const onSelectTabMock = jest.fn();
    const details = {
      overall: 80,
      personal: 100,
      summary: 100,
      skills: 80,
      experience: 90,
      education: 100,
      projects: 60,
      certifications: 0,
    };

    render(
      <ProfileCompletenessCard
        details={details}
        onSelectTab={onSelectTabMock}
      />
    );

    const expBtn = screen.getByText("Experience");
    fireEvent.click(expBtn);

    expect(onSelectTabMock).toHaveBeenCalledWith("experience");
  });
});
