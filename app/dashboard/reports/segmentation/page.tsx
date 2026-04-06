import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getSegmentationReport } from "@/lib/pms/reports/segmentation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/reports/kpi-cards";
import { SegmentationChart } from "@/components/reports/segmentation-chart";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { format, subDays } from "date-fns";
import { Suspense } from "react";

type PageProps = {
  searchParams?: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function toIsoDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function getDefaults() {
  const to = new Date();
  return { from: toIsoDate(subDays(to, 29)), to: toIsoDate(to) };
}

export default async function SegmentationReportPage({ searchParams }: PageProps) {
  await redirectIfNotAuthenticated();

  const propertyId = await getActivePropertyId();
  if (!propertyId) {
    return <div className="py-10 text-center text-sm text-zinc-400">Select a property first.</div>;
  }

  const canView = await hasPermission(propertyId, "reports.view");
  if (!canView) redirect("/dashboard?error=Access%20denied");

  const q = (await searchParams) ?? {};
  const defaults = getDefaults();
  const dateFrom = first(q.from) ?? defaults.from;
  const dateTo = first(q.to) ?? defaults.to;

  const report = await getSegmentationReport({ propertyId, dateFrom, dateTo });

  const topSource = report.segments[0] ?? null;
  const avgRevenueMinor =
    report.totalReservations > 0
      ? Math.round(report.totalRevenueMinor / report.totalReservations)
      : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ReportFilterBar defaultFrom={defaults.from} defaultTo={defaults.to} />
          </Suspense>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Reservations"
          value={String(report.totalReservations)}
          sub={`${dateFrom} → ${dateTo}`}
          tone="orange"
        />
        <KpiCard
          label="Top Source"
          value={topSource ? topSource.source : "—"}
          sub={
            topSource
              ? `${topSource.sharePct}% share · ${topSource.reservations} bookings`
              : "No data"
          }
          tone="blue"
        />
        <KpiCard
          label="Avg Revenue / Booking"
          value={formatCurrencyMinor(avgRevenueMinor, report.currencyCode)}
          sub="Across all segments"
          tone="emerald"
        />
      </div>

      {/* Segmentation charts + table */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Market Segmentation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentationChart
            segments={report.segments}
            totalReservations={report.totalReservations}
            totalRevenueMinor={report.totalRevenueMinor}
            currencyCode={report.currencyCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
