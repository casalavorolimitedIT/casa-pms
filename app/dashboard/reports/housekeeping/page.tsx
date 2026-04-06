import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getHousekeepingReport } from "@/lib/pms/reports/housekeeping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/reports/kpi-cards";
import { HousekeepingProductivityTable } from "@/components/reports/housekeeping-productivity-table";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
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

export default async function HousekeepingReportPage({ searchParams }: PageProps) {
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

  const report = await getHousekeepingReport({ propertyId, dateFrom, dateTo });

  const totalAssignments = report.rows.reduce((s, r) => s + r.total, 0);
  const completionPct =
    totalAssignments > 0
      ? Math.round((report.totalCompleted / totalAssignments) * 100)
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
          label="Rooms Completed"
          value={String(report.totalCompleted)}
          sub={`${completionPct}% completion rate`}
          tone="emerald"
        />
        <KpiCard
          label="Pending"
          value={String(report.totalPending)}
          sub="Awaiting action"
          tone={report.totalPending > 0 ? "orange" : "emerald"}
        />
        <KpiCard
          label="Active Attendants"
          value={String(report.rows.length)}
          sub="With assignments this period"
          tone="blue"
        />
      </div>

      {/* Table */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Attendant Productivity</CardTitle>
        </CardHeader>
        <CardContent>
          <HousekeepingProductivityTable
            rows={report.rows}
            totalCompleted={report.totalCompleted}
            totalPending={report.totalPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
