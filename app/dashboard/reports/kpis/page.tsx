import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getKpiReport } from "@/lib/pms/reports/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCardsRow } from "@/components/reports/kpi-cards";
import { KpiAllTrendsChart, KpiTrendChart } from "@/components/reports/kpi-trend-chart";
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

export default async function KpisReportPage({ searchParams }: PageProps) {
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

  const report = await getKpiReport({ propertyId, dateFrom, dateTo });

  const exportRows = report.series.map((d) => ({
    Date: d.date,
    "Occupancy %": d.occupancyPct,
    "Rooms Sold": d.roomsSold,
    "ADR": (d.adrMinor / 100).toFixed(2),
    "RevPAR": (d.revparMinor / 100).toFixed(2),
    Currency: report.currencyCode,
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

      {/* KPI cards */}
      <KpiCardsRow
        occupancyPct={report.avgOccupancyPct}
        adrMinor={report.avgAdrMinor}
        revparMinor={report.avgRevparMinor}
        totalRooms={report.totalRooms}
        currencyCode={report.currencyCode}
      />

      {/* Occupancy + rooms sold trend */}
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Occupancy & Rooms Sold</CardTitle>
          <ExportControls rows={exportRows} filename={`kpis-${dateFrom}-${dateTo}.csv`} />
        </CardHeader>
        <CardContent>
          <KpiAllTrendsChart series={report.series} currencyCode={report.currencyCode} />
        </CardContent>
      </Card>

      {/* ADR trend */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Average Daily Rate (ADR)</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiTrendChart series={report.series} currencyCode={report.currencyCode} activeMetric="adr" />
        </CardContent>
      </Card>

      {/* RevPAR trend */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">RevPAR</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiTrendChart series={report.series} currencyCode={report.currencyCode} activeMetric="revpar" />
        </CardContent>
      </Card>

      {/* Daily breakdown table */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Daily KPI Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">Rooms Sold</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">Occupancy</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">ADR</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-600">RevPAR</th>
                </tr>
              </thead>
              <tbody>
                {report.series.map((d) => (
                  <tr key={d.date} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-4 py-2.5 text-zinc-700">{d.date}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {d.roomsSold}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {d.occupancyPct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {formatCurrencyMinor(d.adrMinor, report.currencyCode)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {formatCurrencyMinor(d.revparMinor, report.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
