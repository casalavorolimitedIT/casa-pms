"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const REPORT_NAV = [
  { href: "/dashboard/reports", label: "Overview", exact: true },
  { href: "/dashboard/reports/revenue", label: "Revenue" },
  { href: "/dashboard/reports/kpis", label: "KPIs" },
  { href: "/dashboard/reports/ar", label: "AR Aging" },
  { href: "/dashboard/reports/housekeeping", label: "Housekeeping" },
  { href: "/dashboard/reports/pace", label: "Pace" },
  { href: "/dashboard/reports/segmentation", label: "Segmentation" },
];

export function ReportsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-100 bg-zinc-50/70 p-1 backdrop-blur-sm">
      {REPORT_NAV.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-white text-orange-700 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
