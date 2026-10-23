"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CreditsWidget } from "@/components/dashboard/credits-widget";
import { NavUser } from "@/components/dashboard/nav-user";
import { HugeiconsIcon } from "@hugeicons/react";
import { ROUTES } from "@/lib/routes";
import {
  Briefcase01Icon,
  File01Icon,
  UserIcon,
  TaskDone01Icon,
  CreditCardIcon,
  Settings01Icon,
  DashboardCircleIcon,
} from "@hugeicons/core-free-icons";

const navigationItems = [
  {
    title: "Dashboard",
    url: ROUTES.dashboard,
    icon: DashboardCircleIcon,
    exact: true, // only active on exact match
  },
  {
    title: "Jobs",
    url: ROUTES.jobs,
    icon: Briefcase01Icon,
    exact: false,
  },
  {
    title: "Resume",
    url: ROUTES.resume,
    icon: File01Icon,
    exact: false,
  },
  {
    title: "Profile",
    url: ROUTES.profile,
    icon: UserIcon,
    exact: false,
  },
  {
    title: "Application Status",
    url: ROUTES.applications,
    icon: TaskDone01Icon,
    exact: false,
  },
];

interface AppSidebarProps {
  user?: {
    email?: string | null;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-zinc-200 bg-white text-zinc-900"
    >
      {/* ── Top Header: Brand Logo & App Name ───────────────────────────── */}
      <SidebarHeader className="border-b border-zinc-200 p-3.5 bg-white">
        <div className="flex items-center justify-between gap-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden transition-opacity hover:opacity-90"
          >
            {/* Logo mark with clean container */}
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <Image
                src="/jobbuddy-logo.png"
                alt="JobBuddy AI Logo"
                width={40}
                height={40}
                className="size-full object-cover"
                priority
              />
            </div>

            {/* Brand text */}
            <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-zinc-900">
                  JobBuddy
                </span>
                <span className="rounded bg-[#65a30d] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
                  AI
                </span>
              </div>
              <span className="text-xs text-zinc-500 leading-normal break-words">
                AI Job Application Agent
              </span>
            </div>
          </Link>

          {/* Quick toggle trigger on desktop when expanded */}
          <div className="hidden group-data-[collapsible=icon]:hidden md:block">
            <SidebarTrigger className="size-8 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" />
          </div>
        </div>
      </SidebarHeader>

      {/* ── Main Navigation Content ──────────────────────────────────────── */}
      <SidebarContent className="px-3 py-4 bg-white">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2.5">
              {navigationItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.url
                  : pathname === item.url || pathname.startsWith(item.url + "/");

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      className={
                        isActive
                          ? "h-11 border-l-[3px] border-[var(--accent-text)] bg-[var(--accent-soft)] px-3 text-sm font-semibold text-zinc-950"
                          : "h-11 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                      }
                      tooltip={item.title}
                      isActive={isActive}
                      size="default"
                    >
                      <HugeiconsIcon
                        icon={item.icon}
                        className={
                          isActive
                            ? "size-5 shrink-0 text-[var(--accent-text)]"
                            : "size-5 shrink-0 text-zinc-500 group-hover:text-zinc-950"
                        }
                        strokeWidth={2}
                      />
                      <span className="truncate text-sm">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Bottom Footer Section ────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-zinc-200 p-3 bg-white">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {/* Billing / Credits Option */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={ROUTES.billing} />}
                  className={
                    pathname.startsWith(ROUTES.billing)
                      ? "h-10 border-l-[3px] border-[var(--accent-text)] bg-[var(--accent-soft)] px-3 text-sm font-semibold text-zinc-950"
                      : "h-10 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                  }
                  tooltip="Billing / Credits"
                  isActive={pathname.startsWith(ROUTES.billing)}
                >
                  <HugeiconsIcon
                    icon={CreditCardIcon}
                    className={
                      pathname.startsWith(ROUTES.billing)
                        ? "size-5 shrink-0 text-[var(--accent-text)]"
                        : "size-5 shrink-0 text-zinc-500"
                    }
                    strokeWidth={2}
                  />
                  <span className="truncate text-sm">Billing / Credits</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Profile Settings Option */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={ROUTES.settings} />}
                  className={
                    pathname.startsWith(ROUTES.settings)
                      ? "h-10 border-l-[3px] border-[var(--accent-text)] bg-[var(--accent-soft)] px-3 text-sm font-semibold text-zinc-950"
                      : "h-10 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                  }
                  tooltip="Profile Settings"
                  isActive={pathname.startsWith(ROUTES.settings)}
                >
                  <HugeiconsIcon
                    icon={Settings01Icon}
                    className={
                      pathname.startsWith(ROUTES.settings)
                        ? "size-5 shrink-0 text-[var(--accent-text)]"
                        : "size-5 shrink-0 text-zinc-500"
                    }
                    strokeWidth={2}
                  />
                  <span className="truncate text-sm">Profile Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Proper Credits Display Section */}
        <div className="my-2">
          <CreditsWidget used={2} total={10} planName="Free Plan" />
        </div>

        {/* User Account Section */}
        <NavUser user={user} />
      </SidebarFooter>

      {/* Resize/Toggle Rail */}
      <SidebarRail />
    </Sidebar>
  );
}
