import { AppSidebar } from "@/components/app-sidebar";
import { PropertySwitcher } from "@/components/nav/property-switcher";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfNotAuthenticated();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex min-h-16 items-center gap-3 border-b px-4 py-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <PropertySwitcher />
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
