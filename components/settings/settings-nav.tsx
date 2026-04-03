"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Building06Icon,
  UserGroupIcon,
  Notification01Icon,
  CreditCardIcon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";

const NAV_ITEMS = [
  {
    label: "General",
    href: "/dashboard/settings/general",
    icon: Settings01Icon,
    description: "Organization name & branding",
  },
  {
    label: "Properties",
    href: "/dashboard/settings/property",
    icon: Building06Icon,
    description: "Check-in times, currency, timezone",
  },
  {
    label: "Roles & Permissions",
    href: "/dashboard/settings/roles",
    icon: ShieldKeyIcon,
    description: "Control what each role can do",
  },
  {
    label: "Staff",
    href: "/dashboard/settings/staff",
    icon: UserGroupIcon,
    description: "Manage access assignments",
  },
  {
    label: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Notification01Icon,
    description: "Alerts & messaging preferences",
  },
  {
    label: "Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCardIcon,
    description: "Subscription & invoices",
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              isActive
                ? "bg-[#ff6900]/10 text-[#c75200] font-medium"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
                isActive
                  ? "border-[#ff6900]/25 bg-[#ff6900]/12 text-[#c75200]"
                  : "border-zinc-200 bg-white text-zinc-500 group-hover:border-zinc-300 group-hover:text-zinc-700"
              }`}
            >
              <HugeiconsIcon icon={item.icon} strokeWidth={1.75} className="size-4" />
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
