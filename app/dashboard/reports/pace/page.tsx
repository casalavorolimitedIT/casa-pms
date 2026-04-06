import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getPaceReport } from "@/lib/pms/reports/pace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/reports/kpi-cards";
import { PaceCurveChart } from "@/components/reports/pace-curve-chart";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ExportControls } from "@/components/reports/export-controls";
import { format, addDays } from "date-fns";
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
  const from = new Date();
  return { from: toIsoDate(from), to: toIsoDate(addDays(from, 89)) };
}

export default async function PaceReportPage({ searchParams }: PageProps) {
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

  const report = await getPaceReport({ propertyId, dateFrom, dateTo });

  const changeVsPrior =
    report.totalPriorYearBookings > 0
      ? Math.round(
          ((report.totalCurrentBookings - report.totalPriorYearBookings) /
            report.totalPriorYearBookings) *
            100,
        )
      : null;

  const exportRows = report.series.map((d) => ({
    "Arrival Date": d.arrivalDate,
    "Current Bookings": d.currentBookings,
    "Prior Year Bookings": d.priorYearBookings,
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Date Window (Arrival Dates)</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ReportFilterBar defaultFrom={defaults.from} defaultTo={defaults.to} />
          </Suspense>
          <p className="mt-2 text-xs text-zinc-500">
            Defaults to the next 90 days. Adjust to view historical pace or a custom horizon.
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Bookings on the Books"
          value={String(report.totalCurrentBookings)}
          sub={`For ${dateFrom} → ${dateTo}`}
          tone="orange"
        />
        <KpiCard
          label="Prior Year (same window)"
          value={String(report.totalPriorYearBookings)}
          sub={
            changeVsPrior !== null
              ? changeVsPrior >= 0
                ? `↑ ${changeVsPrior}% ahead`
                : `↓ ${Math.abs(changeVsPrior)}% behind`
              : "No prior data"
          }
          tone="blue"
        />
        <KpiCard
          label="Forecast Occupancy"
          value={`${report.forecastOccupancyPct}%`}
          sub={`${report.totalRooms} rooms available`}
          tone="emerald"
        />
      </div>

      {/* Pace chart */}
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Booking Pace Curve</CardTitle>
          <ExportControls rows={exportRows} filename={`pace-${dateFrom}-${dateTo}.csv`} />
        </CardHeader>
        <CardContent>
          <PaceCurveChart series={report.series} />
        </CardContent>
      </Card>

      {/* Pickup detail table */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Daily Pickup Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Arrival Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">This Period</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">Prior Year</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">Δ</th>
                </tr>
              </thead>
              <tbody>
                {report.series
                  .filter((d) => d.currentBookings > 0 || d.priorYearBookings > 0)
                  .map((d) => {
                    const delta = d.currentBookings - d.priorYearBookings;
                    return (
                      <tr key={d.arrivalDate} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-4 py-2.5 text-zinc-700">{d.arrivalDate}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-zinc-900">
                          {d.currentBookings}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                          {d.priorYearBookings}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right tabular-nums ${
                            delta > 0
                              ? "text-emerald-600"
                              : delta < 0
                                ? "text-red-500"
                                : "text-zinc-400"
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
