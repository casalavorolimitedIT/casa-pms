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
  "Core PMS": "Manage rooms, guests, and reservations with complete operational context.",
  Commercial: "Control rates, packages, and seasonal pricing strategy.",
  Operations: "Run front office, housekeeping, engineering, and guest service workflows.",
}

const SUBMENU_DESCRIPTIONS: Record<string, string> = {
  Dashboard: "High-level property health, occupancy, and daily KPIs.",
  "Front Desk": "Handle check-ins, check-outs, and live guest interactions.",
  Folios: "Review and manage guest billing, charges, and payments.",
  Rooms: "Configure inventory, statuses, and room-level readiness.",
  Guests: "Maintain guest profiles, notes, and stay history.",
  Reservations: "Manage upcoming and in-house bookings end-to-end.",
  Rates: "Control sell rates and pricing strategy by date.",
  Packages: "Bundle rates with perks and inclusions.",
  Seasons: "Apply period-based pricing and availability rules.",
  Channels: "Connect OTAs and map external bookings into PMS reservations.",
  Pricing: "Configure dynamic pricing rules and preview impacts.",
  Corporate: "Manage negotiated accounts, billing cycles, and AR tracking.",
  Loyalty: "Track points earning, redemption, and tier progression.",
  Agents: "Manage travel-agent profiles, commissions, and payout tracking.",
  "Arrivals & Departures": "Track today’s guest movement and priorities.",
  "Room Board": "Visual room status board for operations coordination.",
  Housekeeping: "Assign and monitor cleaning and inspection tasks.",
  "Work Orders": "Log and resolve engineering and maintenance issues.",
  Tasks: "Create and track operational tasks across teams.",
  "Lost & Found": "Record found items and manage claim workflow.",
  Linen: "Track linen movement, losses, and reconciliation.",
  Minibar: "Post minibar consumption directly to folios.",
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
