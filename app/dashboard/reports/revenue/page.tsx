import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getRevenueReport } from "@/lib/pms/reports/revenue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/reports/kpi-cards";
import { RevenueBreakdownChart } from "@/components/reports/revenue-breakdown-chart";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ExportControls } from "@/components/reports/export-controls";
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

export default async function RevenueReportPage({ searchParams }: PageProps) {
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

  const report = await getRevenueReport({ propertyId, dateFrom, dateTo });

  const revChange =
    report.priorPeriodTotalMinor > 0
      ? Math.round(
          ((report.totalMinor - report.priorPeriodTotalMinor) / report.priorPeriodTotalMinor) * 100,
        )
      : null;

  const avgDailyMinor =
    report.series.length > 0 ? Math.round(report.totalMinor / report.series.length) : 0;

  const exportRows = report.series.map((d) => ({
    Date: d.date,
    Total: (d.totalMinor / 100).toFixed(2),
    Currency: report.currencyCode,
    ...Object.fromEntries(
      Object.entries(d.byCategory).map(([k, v]) => [k, (v / 100).toFixed(2)]),
    ),
  }));

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

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Revenue"
          value={formatCurrencyMinor(report.totalMinor, report.currencyCode)}
          sub={
            revChange !== null
              ? revChange >= 0
                ? `↑ ${revChange}% vs prior period`
                : `↓ ${Math.abs(revChange)}% vs prior period`
              : undefined
          }
          tone="orange"
        />
        <KpiCard
          label="Avg Daily Revenue"
          value={formatCurrencyMinor(avgDailyMinor, report.currencyCode)}
          sub={`Over ${report.series.length} days`}
          tone="blue"
        />
        <KpiCard
          label="Forward Booked"
          value={formatCurrencyMinor(report.forwardBookedMinor, report.currencyCode)}
          sub="Future confirmed bookings"
          tone="emerald"
        />
      </div>

      {/* Chart */}
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daily Revenue Breakdown</CardTitle>
          <ExportControls rows={exportRows} filename={`revenue-${dateFrom}-${dateTo}.csv`} />
        </CardHeader>
        <CardContent>
          <RevenueBreakdownChart
            series={report.series}
            categories={report.categories}
            currencyCode={report.currencyCode}
          />
        </CardContent>
      </Card>

      {/* Category summary table */}
      {report.categories.length > 0 && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-zinc-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-zinc-600">Category</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-600">Total</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-600">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((cat) => {
                    const total = report.series.reduce(
                      (s, d) => s + (d.byCategory[cat] ?? 0),
                      0,
                    );
                    const share =
                      report.totalMinor > 0
                        ? Math.round((total / report.totalMinor) * 1000) / 10
                        : 0;
                    return (
                      <tr key={cat} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium capitalize text-zinc-900">
                          {cat.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                          {formatCurrencyMinor(total, report.currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
