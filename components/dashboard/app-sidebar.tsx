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
import {
  Briefcase01Icon,
  File01Icon,
  UserIcon,
  TaskDone01Icon,
  CreditCardIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

const navigationItems = [
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: Briefcase01Icon,
  },
  {
    title: "Resume",
    url: "/dashboard/resume",
    icon: File01Icon,
  },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: UserIcon,
  },
  {
    title: "Application Status",
    url: "/dashboard/applications",
    icon: TaskDone01Icon,
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
      className="border-r border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-100 transition-colors"
    >
      {/* ── Top Header: Brand Logo & App Name ───────────────────────────── */}
      <SidebarHeader className="border-b border-zinc-200 dark:border-zinc-800/80 p-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden transition-opacity hover:opacity-90"
          >
            {/* Logo mark with neon lime accent and glow */}
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#ACF417]/40 bg-zinc-900 shadow-[0_0_15px_rgba(172,244,23,0.2)]">
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
                <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                  JobBuddy
                </span>
                <span className="rounded bg-[#ACF417] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-zinc-950">
                  AI
                </span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal break-words">
                AI Job Application Agent
              </span>
            </div>
          </Link>

          {/* Quick toggle trigger on desktop when expanded */}
          <div className="hidden group-data-[collapsible=icon]:hidden md:block">
            <SidebarTrigger className="size-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-[#ACF417]" />
          </div>
        </div>
      </SidebarHeader>

      {/* ── Main Navigation Content ──────────────────────────────────────── */}
      <SidebarContent className="px-3 py-4 bg-white dark:bg-zinc-950 transition-colors">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2.5">
              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.url}
                          className={
                            isActive
                              ? "h-12 border-l-[3px] border-[#65a30d] bg-[#EAFCC7] px-3 text-base font-semibold text-zinc-950 shadow-sm dark:border-[#ACF417] dark:bg-[#ACF417]/10 dark:text-[#ACF417] dark:shadow-[inset_0_0_12px_rgba(172,244,23,0.06)]"
                              : "h-12 px-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                          }
                        />
                      }
                      tooltip={item.title}
                      isActive={isActive}
                      size="default"
                    >
                      <HugeiconsIcon
                        icon={item.icon}
                        className={
                          isActive
                            ? "size-6 shrink-0 text-[#65a30d] dark:text-[#ACF417]"
                            : "size-6 shrink-0 text-zinc-500 group-hover:text-zinc-950 dark:text-zinc-400 dark:group-hover:text-zinc-200"
                        }
                        strokeWidth={2}
                      />
                      <span className="truncate text-base">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Bottom Footer Section ────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-zinc-200 dark:border-zinc-800/80 p-3 bg-white dark:bg-zinc-950 transition-colors">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {/* Billing / Credits Option */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      href="/dashboard/billing"
                      className={
                        pathname.startsWith("/dashboard/billing")
                          ? "h-11 border-l-[3px] border-[#65a30d] bg-[#EAFCC7] px-3 text-base font-semibold text-zinc-950 dark:border-[#ACF417] dark:bg-[#ACF417]/10 dark:text-[#ACF417]"
                          : "h-11 px-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      }
                    />
                  }
                  tooltip="Billing / Credits"
                  isActive={pathname.startsWith("/dashboard/billing")}
                >
                  <HugeiconsIcon
                    icon={CreditCardIcon}
                    className={
                      pathname.startsWith("/dashboard/billing")
                        ? "size-5.5 shrink-0 text-[#65a30d] dark:text-[#ACF417]"
                        : "size-5.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                    }
                    strokeWidth={2}
                  />
                  <span className="truncate text-base">Billing / Credits</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Profile Settings Option */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      href="/dashboard/settings"
                      className={
                        pathname.startsWith("/dashboard/settings")
                          ? "h-11 border-l-[3px] border-[#65a30d] bg-[#EAFCC7] px-3 text-base font-semibold text-zinc-950 dark:border-[#ACF417] dark:bg-[#ACF417]/10 dark:text-[#ACF417]"
                          : "h-11 px-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      }
                    />
                  }
                  tooltip="Profile Settings"
                  isActive={pathname.startsWith("/dashboard/settings")}
                >
                  <HugeiconsIcon
                    icon={Settings01Icon}
                    className={
                      pathname.startsWith("/dashboard/settings")
                        ? "size-5.5 shrink-0 text-[#65a30d] dark:text-[#ACF417]"
                        : "size-5.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                    }
                    strokeWidth={2}
                  />
                  <span className="truncate text-base">Profile Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Proper Credits Display Section with #ACF417 accents */}
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
