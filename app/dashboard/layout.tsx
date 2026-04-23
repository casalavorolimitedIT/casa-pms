import { AppSidebar } from "@/components/app-sidebar";
import { PropertySwitcher } from "@/components/nav/property-switcher";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { PageTransition } from "@/components/ui/page-transition";
import { NoiseOverlay } from "@/components/ui/noise-overlay";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSetupStatus } from "@/lib/setup/get-setup-status";
import { getCurrentUserPermissions } from "@/lib/staff/server-permissions";
import { PermissionsProvider } from "@/components/permissions-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfNotAuthenticated();

  const setupStatus = await getSetupStatus();

  if (setupStatus.user && !setupStatus.organizationId) {
    redirect("/setup");
  }

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const permissions = await getCurrentUserPermissions();

  return (
    <PermissionsProvider permissions={permissions}>
    <SidebarProvider>
      <NoiseOverlay />
      <AppSidebar variant="floating" />
      <SidebarInset className="relative min-w-0 bg-transparent">
        {/* Ambient warm bloom — very subtle, top-right corner */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-24 right-0 h-120 w-120 rounded-full bg-[#ff6900] opacity-[0.08] blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-90 w-120 -translate-x-1/2 rounded-full bg-[#ff6900] opacity-[0.06] blur-[120px]" />
        </div>
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-5" />
              <div className="hidden sm:block">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 whitespace-nowrap">Operations Desk</p>
                <p className="text-sm font-semibold text-zinc-900">{formattedDate}</p>
              </div>
              <PropertySwitcher />
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white/70">
                <Link href="/dashboard/stay-view">Today&apos;s Board</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
                <Link href="/dashboard/stay-view">Open Stay View</Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
    </SidebarProvider>
    </PermissionsProvider>
  );
}
