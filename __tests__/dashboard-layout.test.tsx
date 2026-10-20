/* eslint-disable @typescript-eslint/no-require-imports */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { SidebarProvider } from "@/components/ui/sidebar";

// Mock server action module — it imports next/cache which requires Node APIs
jest.mock("@/features/auth/actions", () => ({
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/jobs",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock useIsMobile hook to avoid window.matchMedia issues in jsdom
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

// Lazy-import after mocks are set up
const { CreditsWidget } = require("@/components/dashboard/credits-widget");
const { DashboardHeader } = require("@/components/dashboard/dashboard-header");
const { AppSidebar } = require("@/components/dashboard/app-sidebar");

describe("Phase 3 — Dashboard Layout Components", () => {
  describe("DashboardPlaceholder", () => {
    it("renders the exact Chapter 3 design brief text", () => {
      render(<DashboardPlaceholder title="Jobs" />);

      expect(screen.getByText("Jobs")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Main Content Area - Keep blank for now. Pages will render here later based on navigation."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Chapter 3 — Dashboard Shell Active")
      ).toBeInTheDocument();
    });

    it("renders without icon when none provided", () => {
      const { container } = render(<DashboardPlaceholder title="Test" />);
      const iconWrapper = container.querySelector("[data-slot='hugeicons']");
      expect(iconWrapper).toBeNull();
    });
  });

  describe("CreditsWidget", () => {
    it("renders credit stats, plan name, and upgrade link", () => {
      render(
        <SidebarProvider defaultOpen={true}>
          <CreditsWidget used={2} total={10} planName="Free Plan" />
        </SidebarProvider>
      );

      expect(screen.getByText("Credits")).toBeInTheDocument();
      expect(screen.getByText("Free Plan")).toBeInTheDocument();
      expect(screen.getByText("8 / 10")).toBeInTheDocument();
      expect(screen.getByText("Daily applies left")).toBeInTheDocument();
      expect(screen.getByText("Upgrade for more credits")).toBeInTheDocument();
    });

    it("renders correct remaining count when fully used", () => {
      render(
        <SidebarProvider defaultOpen={true}>
          <CreditsWidget used={10} total={10} planName="Free Plan" />
        </SidebarProvider>
      );

      expect(screen.getByText("0 / 10")).toBeInTheDocument();
    });
  });

  describe("DashboardHeader", () => {
    it("renders active route title and AI status badge", () => {
      const mockUser = {
        email: "test@jobbuddy.ai",
        user_metadata: { full_name: "Test User" },
      };

      render(
        <SidebarProvider defaultOpen={true}>
          <DashboardHeader user={mockUser} />
        </SidebarProvider>
      );

      expect(screen.getByText("Jobs")).toBeInTheDocument();
      expect(screen.getByText("AI Agent Active")).toBeInTheDocument();
      expect(screen.getByText("TU")).toBeInTheDocument();
    });

    it("renders theme toggle button with accessible label", () => {
      const mockUser = {
        email: "test@jobbuddy.ai",
        user_metadata: { full_name: "Test User" },
      };

      render(
        <SidebarProvider defaultOpen={true}>
          <DashboardHeader user={mockUser} />
        </SidebarProvider>
      );

      const toggleBtn = screen.getByRole("button", {
        name: /switch to (white|black) background/i,
      });
      expect(toggleBtn).toBeInTheDocument();
    });
  });

  describe("AppSidebar", () => {
    it("renders the brand header and all required navigation items", () => {
      const mockUser = {
        email: "alex@jobbuddy.ai",
        user_metadata: { full_name: "Alex Doe" },
      };

      render(
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={mockUser} />
        </SidebarProvider>
      );

      // Brand
      expect(screen.getByAltText("JobBuddy AI Logo")).toBeInTheDocument();
      expect(screen.getByText("JobBuddy")).toBeInTheDocument();
      expect(screen.getByText("AI")).toBeInTheDocument();
      expect(screen.getByText("AI Job Application Agent")).toBeInTheDocument();

      // Core navigation items
      expect(screen.getByText("Jobs")).toBeInTheDocument();
      expect(screen.getByText("Resume")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Application Status")).toBeInTheDocument();

      // Footer options
      expect(screen.getByText("Billing / Credits")).toBeInTheDocument();
      expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    });

    it("has correct href links for all navigation items", () => {
      const mockUser = {
        email: "alex@jobbuddy.ai",
        user_metadata: { full_name: "Alex Doe" },
      };

      render(
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={mockUser} />
        </SidebarProvider>
      );

      expect(screen.getByRole("link", { name: /jobs/i })).toHaveAttribute(
        "href",
        "/dashboard/jobs"
      );
      expect(screen.getByRole("link", { name: /resume/i })).toHaveAttribute(
        "href",
        "/dashboard/resume"
      );
      expect(screen.getByRole("link", { name: /profile$/i })).toHaveAttribute(
        "href",
        "/dashboard/profile"
      );
      expect(
        screen.getByRole("link", { name: /application status/i })
      ).toHaveAttribute("href", "/dashboard/applications");
      expect(
        screen.getByRole("link", { name: /billing \/ credits/i })
      ).toHaveAttribute("href", "/dashboard/billing");
      expect(
        screen.getByRole("link", { name: /profile settings/i })
      ).toHaveAttribute("href", "/dashboard/settings");
    });

    it("renders navigation label section", () => {
      const mockUser = {
        email: "test@example.com",
        user_metadata: { full_name: "Test" },
      };

      render(
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={mockUser} />
        </SidebarProvider>
      );

      expect(screen.getByText("Navigation")).toBeInTheDocument();
    });
  });
});
