"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
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
        },
        {
          title: "Folios",
          url: "/dashboard/folios",
        },
      ],
    },
    {
      title: "Core PMS",
      url: "/dashboard/reservations",
      icon: (
        <HugeiconsIcon icon={BedIcon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Rooms",
          url: "/dashboard/rooms",
        },
        {
          title: "Guests",
          url: "/dashboard/guests",
        },
        {
          title: "Staff",
          url: "/dashboard/staff",
        },
        {
          title: "Reservations",
          url: "/dashboard/reservations",
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
        },
        {
          title: "Packages",
          url: "/dashboard/rates/packages",
        },
        {
          title: "Seasons",
          url: "/dashboard/rates/seasons",
        },
        {
          title: "Channels",
          url: "/dashboard/channels",
        },
        {
          title: "Pricing",
          url: "/dashboard/pricing",
        },
        {
          title: "Corporate",
          url: "/dashboard/corporate",
        },
        {
          title: "Loyalty",
          url: "/dashboard/loyalty",
        },
        {
          title: "Agents",
          url: "/dashboard/agents",
        },
      ],
    },
    {
      title: "Operations",
      url: "/dashboard/front-desk",
      icon: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      items: [
        {
          title: "Check-in",
          url: "/dashboard/front-desk",
        },
        {
          title: "Arrivals & Departures",
          url: "/dashboard/arrivals-departures",
        },
        {
          title: "Room Board",
          url: "/dashboard/room-board",
        },
        {
          title: "Housekeeping",
          url: "/dashboard/housekeeping",
        },
        {
          title: "Work Orders",
          url: "/dashboard/work-orders",
        },
        {
          title: "Tasks",
          url: "/dashboard/tasks",
        },
        {
          title: "Lost & Found",
          url: "/dashboard/lost-found",
        },
        {
          title: "Linen",
          url: "/dashboard/linen",
        },
        {
          title: "Minibar",
          url: "/dashboard/minibar",
        },
        {
          title: "Wake-up Calls",
          url: "/dashboard/front-desk/wake-up-calls",
        },
        {
          title: "DND Log",
          url: "/dashboard/dnd-log",
        },
        {
          title: "Night Audit",
          url: "/dashboard/night-audit",
        },
        {
          title: "Cashier",
          url: "/dashboard/cashier",
        },
        {
          title: "Concierge",
          url: "/dashboard/concierge",
        },
        {
          title: "Messaging",
          url: "/dashboard/messaging",
        },
        {
          title: "Pre-arrival",
          url: "/dashboard/pre-arrival",
        },
        {
          title: "VIP Guests",
          url: "/dashboard/guests/vip",
        },
        {
          title: "Guest Feedback",
          url: "/dashboard/feedback",
        },
        {
          title: "Digital Keys",
          url: "/dashboard/keys",
        },
        {
          title: "Room Move",
          url: "/dashboard/front-desk/room-move",
        },
        {
          title: "Company Ledger",
          url: "/dashboard/folios/company",
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
        },
        {
          title: "Properties",
          url: "/dashboard/settings/property",
        },
        {
          title: "Roles & Permissions",
          url: "/dashboard/settings/roles",
        },
        {
          title: "Staff",
          url: "/dashboard/settings/staff",
        },
        {
          title: "Notifications",
          url: "/dashboard/settings/notifications",
        },
        {
          title: "Billing",
          url: "/dashboard/settings/billing",
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
      url: "/dashboard/reservations",
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
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
