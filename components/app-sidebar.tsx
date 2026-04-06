"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { usePermissions } from "@/components/permissions-provider"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutBottomIcon, AudioWave01Icon, CommandIcon, Home11Icon, UserGroupIcon, BedIcon, Calendar03Icon, Invoice03Icon, DollarSquareIcon, PieChartIcon, FolderOpenIcon, Building06Icon, UserIdVerificationIcon, Settings01Icon } from "@hugeicons/core-free-icons"

// This is sample data.
const data = {
  user: {
    name: "Casa PMS",
    email: "ops@casapms.local",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: (
        <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} />
      ),
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: (
        <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
      ),
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: (
        <HugeiconsIcon icon={Home11Icon} strokeWidth={2} />
      ),
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Front Desk",
          url: "/dashboard/front-desk",
          requiredPermission: "checkin.perform",
        },
        {
          title: "Folios",
          url: "/dashboard/folios",
          requiredPermission: "folios.view",
        },
      ],
    },
    {
      title: "Core PMS",
      url: "/dashboard/reservations/calendar",
      icon: (
        <HugeiconsIcon icon={BedIcon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Rooms",
          url: "/dashboard/rooms",
          requiredPermission: "rooms.view",
        },
        {
          title: "Guests",
          url: "/dashboard/guests",
          requiredPermission: "guests.view",
        },
        {
          title: "Staff",
          url: "/dashboard/staff",
          requiredPermission: "staff.view",
        },
        {
          title: "Reservations",
          url: "/dashboard/reservations/calendar",
          requiredPermission: "reservations.view",
        },
        {
          title: "Central Reservations",
          url: "/dashboard/central-reservations",
          requiredPermission: "reservations.view",
        },
      ],
    },
    {
      title: "Commercial",
      url: "/dashboard/rates",
      icon: (
        <HugeiconsIcon icon={DollarSquareIcon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Rates",
          url: "/dashboard/rates",
          requiredPermission: "rates.view",
        },
        {
          title: "Packages",
          url: "/dashboard/rates/packages",
          requiredPermission: "rates.view",
        },
        {
          title: "Seasons",
          url: "/dashboard/rates/seasons",
          requiredPermission: "rates.view",
        },
        {
          title: "Channels",
          url: "/dashboard/channels",
          requiredPermission: "rates.manage",
        },
        {
          title: "Pricing",
          url: "/dashboard/pricing",
          requiredPermission: "rates.manage",
        },
        {
          title: "Corporate",
          url: "/dashboard/corporate",
          requiredPermission: "rates.view",
        },
        {
          title: "Loyalty",
          url: "/dashboard/loyalty",
          requiredPermission: "rates.view",
        },
        {
          title: "Chain Rates",
          url: "/dashboard/rates/chain",
          requiredPermission: "rates.manage",
        },
        {
          title: "Chain Reports",
          url: "/dashboard/chain-reports",
          requiredPermission: "reports.view",
        },
        {
          title: "Agents",
          url: "/dashboard/agents",
          requiredPermission: "rates.manage",
        },
      ],
    },
    {
      title: "Operations Desk",
      url: "/dashboard/front-desk",
      icon: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Check-in",
          url: "/dashboard/front-desk",
          requiredPermission: "checkin.perform",
        },
        {
          title: "Arrivals & Departures",
          url: "/dashboard/arrivals-departures",
          requiredPermission: "reservations.view",
        },
        {
          title: "Room Board",
          url: "/dashboard/room-board",
          requiredPermission: "rooms.view",
        },
        {
          title: "Night Audit",
          url: "/dashboard/night-audit",
          requiredPermission: "night_audit.run",
        },
        {
          title: "Cashier",
          url: "/dashboard/cashier",
          requiredPermission: "cash_shift.manage",
        },
      ],
    },
    {
      title: "Operations Service",
      url: "/dashboard/housekeeping",
      icon: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Housekeeping",
          url: "/dashboard/housekeeping",
          requiredPermission: "housekeeping.view",
        },
        {
          title: "Work Orders",
          url: "/dashboard/work-orders",
          requiredPermission: "work_orders.view",
        },
        {
          title: "Maintenance",
          url: "/dashboard/maintenance",
          requiredPermission: "work_orders.view",
        },
        {
          title: "Assets",
          url: "/dashboard/assets",
          requiredPermission: "settings.manage",
        },
        {
          title: "Spa",
          url: "/dashboard/spa/bookings",
          requiredPermission: "spa.manage",
        },
        {
          title: "Spa Bookings",
          url: "/dashboard/spa/bookings",
          requiredPermission: "spa.manage",
        },
        {
          title: "Spa Therapists",
          url: "/dashboard/spa/therapists",
          requiredPermission: "spa.manage",
        },
        {
          title: "Spa Memberships",
          url: "/dashboard/spa/memberships",
          requiredPermission: "spa.manage",
        },
        {
          title: "Tasks",
          url: "/dashboard/tasks",
          requiredPermission: "tasks.view",
        },
        {
          title: "Lost & Found",
          url: "/dashboard/lost-found",
          requiredPermission: "lost_found.view",
        },
        {
          title: "Linen",
          url: "/dashboard/linen",
          requiredPermission: "linen.manage",
        },
      ],
    },
    {
      title: "Operations F&B",
      url: "/dashboard/minibar",
      icon: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Minibar",
          url: "/dashboard/minibar",
          requiredPermission: "minibar.manage",
        },
        {
          title: "F&B Menus",
          url: "/dashboard/fnb/menus",
          requiredPermission: "minibar.manage",
        },
        {
          title: "F&B QR",
          url: "/dashboard/fnb/qr",
          requiredPermission: "minibar.manage",
        },
        {
          title: "Kitchen Queue",
          url: "/dashboard/fnb/kitchen",
          requiredPermission: "minibar.manage",
        },
        {
          title: "F&B Inventory",
          url: "/dashboard/fnb/inventory",
          requiredPermission: "minibar.manage",
        },
      ],
    },
    {
      title: "Operations Guest",
      url: "/dashboard/concierge",
      icon: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Wake-up Calls",
          url: "/dashboard/front-desk/wake-up-calls",
          requiredPermission: "concierge.manage",
        },
        {
          title: "DND Log",
          url: "/dashboard/dnd-log",
          requiredPermission: "dnd.manage",
        },
        {
          title: "Concierge",
          url: "/dashboard/concierge",
          requiredPermission: "concierge.view",
        },
        {
          title: "Messaging",
          url: "/dashboard/messaging",
          requiredPermission: "messaging.view",
        },
        {
          title: "Pre-arrival",
          url: "/dashboard/pre-arrival",
          requiredPermission: "pre_arrival.view",
        },
        {
          title: "VIP Guests",
          url: "/dashboard/guests/vip",
          requiredPermission: "guests.view",
        },
        {
          title: "Guest Feedback",
          url: "/dashboard/feedback",
          requiredPermission: "feedback.view",
        },
        {
          title: "Digital Keys",
          url: "/dashboard/keys",
          requiredPermission: "keys.manage",
        },
        {
          title: "Room Move",
          url: "/dashboard/front-desk/room-move",
          requiredPermission: "checkin.perform",
        },
        {
          title: "Company Ledger",
          url: "/dashboard/folios/company",
          requiredPermission: "folios.view",
        },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: (
        <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
      ),
      items: [
        {
          title: "General",
          url: "/dashboard/settings/general",
          requiredPermission: "settings.view",
        },
        {
          title: "Properties",
          url: "/dashboard/settings/property",
          requiredPermission: "settings.view",
        },
        {
          title: "Roles & Permissions",
          url: "/dashboard/settings/roles",
          requiredPermission: "settings.view",
        },
        {
          title: "Staff",
          url: "/dashboard/settings/staff",
          requiredPermission: "settings.view",
        },
        {
          title: "Notifications",
          url: "/dashboard/settings/notifications",
          requiredPermission: "settings.view",
        },
        {
          title: "Billing",
          url: "/dashboard/settings/billing",
          requiredPermission: "settings.view",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Rooms",
      url: "/dashboard/rooms",
      icon: (
        <HugeiconsIcon icon={BedIcon} strokeWidth={2} />
      ),
    },
    {
      name: "Guests",
      url: "/dashboard/guests",
      icon: (
        <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
      ),
    },
    {
      name: "Staff",
      url: "/dashboard/staff",
      icon: (
        <HugeiconsIcon icon={UserIdVerificationIcon} strokeWidth={2} />
      ),
    },
    {
      name: "Reservations",
      url: "/dashboard/reservations/calendar",
      icon: (
        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />
      ),
    },
    {
      name: "Front Desk",
      url: "/dashboard/front-desk",
      icon: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
    },
    {
      name: "Folios",
      url: "/dashboard/folios",
      icon: (
        <HugeiconsIcon icon={Invoice03Icon} strokeWidth={2} />
      ),
    },
    {
      name: "Rates",
      url: "/dashboard/rates",
      icon: (
        <HugeiconsIcon icon={PieChartIcon} strokeWidth={2} />
      ),
    },
    {
      name: "Reports",
      url: "/dashboard",
      icon: (
        <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} />
      ),
    },
    {
      name: "Properties",
      url: "/dashboard",
      icon: (
        <HugeiconsIcon icon={Building06Icon} strokeWidth={2} />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { hasPermission } = usePermissions();

  const filteredNavMain = data.navMain.map((group) => {
    return {
      ...group,
      items: group.items?.filter(
        (item: { requiredPermission?: string }) => !item.requiredPermission || hasPermission(item.requiredPermission)
      ),
    };
  }).filter((group) => !group.items || group.items.length > 0);

  const filteredProjects = data.projects;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="rounded-xl border border-sidebar-border/80 bg-white/70 p-3 backdrop-blur-sm dark:bg-zinc-900/70">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/60">Casa PMS</p>
          <p className="mt-1 text-sm font-semibold text-sidebar-foreground">Property Operations</p>
        </div>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        <NavProjects projects={filteredProjects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
