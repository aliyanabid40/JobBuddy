import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guards /dashboard, but keep defense in depth
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <DashboardThemeProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar user={user} />
        <SidebarInset className="min-h-screen bg-transparent text-inherit flex flex-col transition-colors">
          <DashboardHeader user={user} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardThemeProvider>
  );
}
