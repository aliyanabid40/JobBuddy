"use client";

import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  CreditCardIcon,
  Logout01Icon,
  UnfoldMoreIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";

interface NavUserProps {
  user?: {
    email?: string | null;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const email = user?.email ?? "user@jobbuddy.ai";
  const fullName = user?.user_metadata?.full_name ?? email.split("@")[0];
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="h-12 border border-zinc-200 bg-zinc-50/80 text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 data-open:bg-zinc-100 dark:data-open:bg-zinc-900"
                tooltip={isCollapsed ? fullName : undefined}
              />
            }
          >
            <Avatar size="sm" className="size-8 shrink-0 rounded-lg">
              <AvatarFallback className="rounded-lg border border-lime-400/60 bg-lime-200/60 text-xs font-bold text-lime-900 dark:border-[#ACF417]/30 dark:bg-[#ACF417]/15 dark:text-[#ACF417]">
                {initials || "JB"}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-zinc-900 dark:text-white">
                {fullName}
              </span>
              <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {email}
              </span>
            </div>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              className="ml-auto size-4 text-zinc-400 group-data-[collapsible=icon]:hidden"
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            side={isMobile ? "bottom" : isCollapsed ? "right" : "top"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                <Avatar size="sm" className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg border border-lime-400/60 bg-lime-200/60 text-xs font-bold text-lime-900 dark:border-[#ACF417]/30 dark:bg-[#ACF417]/15 dark:text-[#ACF417]">
                    {initials || "JB"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-zinc-900 dark:text-white">{fullName}</span>
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link
                    href="/dashboard/profile"
                    prefetch={false}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-[#ACF417]"
                  />
                }
              >
                <HugeiconsIcon icon={UserIcon} className="size-4" strokeWidth={2} />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/dashboard/settings"
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-[#ACF417]"
                  />
                }
              >
                <HugeiconsIcon
                  icon={Settings01Icon}
                  className="size-4"
                  strokeWidth={2}
                />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/dashboard/billing"
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-[#ACF417]"
                  />
                }
              >
                <HugeiconsIcon
                  icon={CreditCardIcon}
                  className="size-4"
                  strokeWidth={2}
                />
                <span>Billing & Credits</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
            <DropdownMenuItem
              render={
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <HugeiconsIcon
                      icon={Logout01Icon}
                      className="size-4"
                      strokeWidth={2}
                    />
                    <span>Sign out</span>
                  </button>
                </form>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
