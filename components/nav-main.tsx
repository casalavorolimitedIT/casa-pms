"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

const NAV_DESCRIPTIONS: Record<string, string> = {
  Overview: "Track occupancy, arrivals, and daily property performance at a glance.",
  "Rooms & Stays": "Manage rooms, guests, reservations, and central booking operations.",
  "Guest Services": "Handle concierge, messaging, requests, and the full guest experience.",
  Housekeeping: "Assign and monitor cleaning, inspection, lost & found, and linen tasks.",
  Engineering: "Log work orders, preventive maintenance, and manage property assets.",
  "F&B": "Operate menus, QR ordering, kitchen queue, inventory, and minibar.",
  Spa: "Schedule treatments, manage therapists, and run membership entitlements.",
  Commercial: "Control rates, packages, and seasonal pricing strategy.",
  Reports: "Decision-grade reporting across revenue, KPIs, AR, and operations.",
  "Finance & Audit": "Manage folios, run the night audit, and handle cashier close.",
  Settings: "Configure property, roles, staff, billing, and notification preferences.",
}

const SUBMENU_DESCRIPTIONS: Record<string, string> = {
  Dashboard: "High-level property health, occupancy, and daily KPIs.",
  "Front Desk": "Handle check-ins, check-outs, and live guest interactions.",
  Folios: "Review and manage guest billing, charges, and payments.",
  Rooms: "Configure inventory, statuses, and room-level readiness.",
  Guests: "Maintain guest profiles, notes, and stay history.",
  Reservations: "Manage upcoming and in-house bookings end-to-end.",
  "Central Reservations": "Search and book across properties with transfer support.",
  Rates: "Control sell rates and pricing strategy by date.",
  Packages: "Bundle rates with perks and inclusions.",
  Seasons: "Apply period-based pricing and availability rules.",
  Channels: "Connect OTAs and map external bookings into PMS reservations.",
  Pricing: "Configure dynamic pricing rules and preview impacts.",
  Corporate: "Manage negotiated accounts, billing cycles, and AR tracking.",
  Loyalty: "Track points earning, redemption, and tier progression.",
  "Chain Rates": "Create shared chain plans and push pricing to selected properties.",
  "Chain Reports": "Compare occupancy and revenue side-by-side across properties.",
  "Overview": "Summary KPIs and links to all report modules.",
  "Revenue": "Daily revenue by source and department with period comparison.",
  "KPIs": "Occupancy, ADR, and RevPAR trends over your selected date range.",
  "AR Aging": "Outstanding folio balances bucketed by age — 0–30, 31–60, 61–90, 90+ days.",
  "Housekeeping Report": "Attendant productivity, rooms cleaned, and pending workload.",
  "Pace Report": "Booking pickup and forecast occupancy vs. prior year.",
  "Segmentation": "Revenue share by direct, OTA, corporate, walk-in, group, and agent.",
  Agents: "Manage travel-agent profiles, commissions, and payout tracking.",
  "Arrivals & Departures": "Track today’s guest movement and priorities.",
  "Room Board": "Visual room status board for operations coordination.",
  Housekeeping: "Assign and monitor cleaning and inspection tasks.",
  "Work Orders": "Log and resolve engineering and maintenance issues.",
  Maintenance: "Plan recurring preventive maintenance and close due tasks.",
  Spa: "Open the spa operations workspace for bookings, therapists, and memberships.",
  "Spa Bookings": "Schedule treatments with therapist and room availability checks.",
  "Spa Therapists": "Manage therapist shifts and treatment qualifications.",
  "Spa Memberships": "Run package entitlements, renewals, and usage tracking.",
  Tasks: "Create and track operational tasks across teams.",
  "Lost & Found": "Record found items and manage claim workflow.",
  Linen: "Track linen movement, losses, and reconciliation.",
  Minibar: "Post minibar consumption directly to folios.",
  "F&B Menus": "Manage outlets, menu categories, item modifiers, and outlet pricing.",
  "F&B QR": "Generate room/table QR codes for mobile guest ordering.",
  "Kitchen Queue": "Run ticket execution from queued to ready and completion.",
  "F&B Inventory": "Track stock levels, receiving, and low-stock alerts.",
  "Wake-up Calls": "Schedule and close wake-up call requests.",
  "DND Log": "Monitor active do-not-disturb windows by room.",
  "Night Audit": "Review and close end-of-day operational checks.",
  Cashier: "Process desk payments and posting corrections.",
  Concierge: "Manage service requests and guest experiences.",
  Messaging: "Unified inbox for outbound and inbound guest communication.",
  "Pre-arrival": "Collect preferences before arrival and trigger prep tasks.",
  "VIP Guests": "Track and action high-priority guest journeys.",
  "Guest Feedback": "View surveys, trends, and service recovery actions.",
  "Digital Keys": "Issue and revoke digital room keys.",
  "Room Move": "Relocate in-house guests and keep inventory accurate.",
  "Company Ledger": "Manage corporate account balances and postings.",
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton
                  tooltip={{
                    side: "right",
                    align: "start",
                    sideOffset: 10,
                    className:
                      "max-w-72 rounded-lg border border-zinc-200 bg-popover px-3 py-2 text-popover-foreground shadow-md",
                    children: (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{item.title}</p>
                        <p className="text-xs leading-relaxed text-zinc-700">{NAV_DESCRIPTIONS[item.title] ?? `Open ${item.title} modules and workflows.`}</p>
                      </div>
                    ),
                  }}
                />
              }
            >
              {item.icon}
              <span>{item.title}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <Tooltip>
                      <SidebarMenuSubButton render={<TooltipTrigger render={<a href={subItem.url} title={subItem.title} />} />}>
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                      <TooltipContent
                        side="right"
                        align="start"
                        sideOffset={10}
                        hidden={isMobile}
                        className="max-w-72 rounded-lg border border-zinc-200 bg-popover px-3 py-2 text-popover-foreground shadow-md"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{subItem.title}</p>
                          <p className="text-xs leading-relaxed text-zinc-700">{SUBMENU_DESCRIPTIONS[subItem.title] ?? `Open ${subItem.title} workflow.`}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
