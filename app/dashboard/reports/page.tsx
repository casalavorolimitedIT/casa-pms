import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getRevenueReport } from "@/lib/pms/reports/revenue";
import { getKpiReport } from "@/lib/pms/reports/kpis";
import { getArAgingReport } from "@/lib/pms/reports/ar-aging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/reports/kpi-cards";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import Link from "next/link";
import { format, subDays } from "date-fns";

function toIsoDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default async function ReportsOverviewPage() {
  await redirectIfNotAuthenticated();

  const propertyId = await getActivePropertyId();
  if (!propertyId) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        Select an active property to view reports.
      </div>
    );
  }

  const canView = await hasPermission(propertyId, "reports.view");
  if (!canView) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20reports");
  }

  const today = new Date();
  const dateFrom = toIsoDate(subDays(today, 29));
  const dateTo = toIsoDate(today);

  const [revenue, kpis, ar] = await Promise.all([
    getRevenueReport({ propertyId, dateFrom, dateTo }),
    getKpiReport({ propertyId, dateFrom, dateTo }),
    getArAgingReport({ propertyId }),
  ]);

  const revChange =
    revenue.priorPeriodTotalMinor > 0
      ? Math.round(
          ((revenue.totalMinor - revenue.priorPeriodTotalMinor) / revenue.priorPeriodTotalMinor) *
            100,
        )
      : null;

  const quickLinks = [
    { href: "/dashboard/reports/revenue", title: "Revenue", desc: "Daily revenue by source and department." },
    { href: "/dashboard/reports/kpis", title: "KPIs", desc: "Occupancy, ADR, and RevPAR trends." },
    { href: "/dashboard/reports/ar", title: "AR Aging", desc: "Outstanding folio balances by age bucket." },
    { href: "/dashboard/reports/housekeeping", title: "Housekeeping", desc: "Attendant productivity and room throughput." },
    { href: "/dashboard/reports/pace", title: "Pace", desc: "Booking pickup vs. prior-year comparison." },
    { href: "/dashboard/reports/segmentation", title: "Segmentation", desc: "Revenue share by direct, OTA, corporate, and more." },
  ];

  return (
    <div className="space-y-6">
      {/* KPI summary strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue (30 days)"
          value={formatCurrencyMinor(revenue.totalMinor, revenue.currencyCode)}
          sub={
            revChange !== null
              ? revChange >= 0
                ? `+${revChange}% vs prior period`
                : `${revChange}% vs prior period`
              : "No prior data"
          }
          tone="orange"
        />
        <KpiCard
          label="Avg Occupancy"
          value={`${kpis.avgOccupancyPct.toFixed(1)}%`}
          sub="Last 30 days"
          tone="blue"
        />
        <KpiCard
          label="ADR"
          value={formatCurrencyMinor(kpis.avgAdrMinor, kpis.currencyCode)}
          sub="Average Daily Rate"
          tone="emerald"
        />
        <KpiCard
          label="AR Outstanding"
          value={formatCurrencyMinor(ar.grandTotalMinor, ar.currencyCode)}
          sub={`${ar.rows.length} open folio${ar.rows.length !== 1 ? "s" : ""}`}
          tone="violet"
        />
      </div>

      {/* Forward booked banner */}
      {revenue.forwardBookedMinor > 0 && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-5 py-4">
          <p className="text-sm font-medium text-orange-900">
            Forward booked revenue:{" "}
            <span className="font-bold">
              {formatCurrencyMinor(revenue.forwardBookedMinor, revenue.currencyCode)}
            </span>{" "}
            from confirmed future reservations.
          </p>
        </div>
      )}

      {/* Module quick-links */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Report Modules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-zinc-100 bg-white/60 p-4 transition-all hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-sm"
            >
              <p className="font-semibold text-zinc-900 group-hover:text-orange-800">
                {link.title} →
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{link.desc}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
