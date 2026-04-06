import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { redirect } from "next/navigation";
import { getArAgingReport } from "@/lib/pms/reports/ar-aging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/reports/kpi-cards";
import { ArAgingTable } from "@/components/reports/ar-aging-table";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

export default async function ArReportPage() {
  await redirectIfNotAuthenticated();

  const propertyId = await getActivePropertyId();
  if (!propertyId) {
    return <div className="py-10 text-center text-sm text-zinc-400">Select a property first.</div>;
  }

  const canView = await hasPermission(propertyId, "reports.view");
  if (!canView) redirect("/dashboard?error=Access%20denied");

  const report = await getArAgingReport({ propertyId });

  const over30 =
    report.bucketTotals["31-60"] +
    report.bucketTotals["61-90"] +
    report.bucketTotals["90+"];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Outstanding"
          value={formatCurrencyMinor(report.grandTotalMinor, report.currencyCode)}
          sub={`${report.rows.length} open folio${report.rows.length !== 1 ? "s" : ""}`}
          tone="orange"
        />
        <KpiCard
          label="Current (0–30 days)"
          value={formatCurrencyMinor(report.bucketTotals.current, report.currencyCode)}
          sub="Within terms"
          tone="emerald"
        />
        <KpiCard
          label="Overdue (31+ days)"
          value={formatCurrencyMinor(over30, report.currencyCode)}
          sub={over30 > 0 ? "Requires follow-up" : "None outstanding"}
          tone={over30 > 0 ? "violet" : "emerald"}
        />
      </div>

      {/* Aging table with buckets */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Accounts Receivable — Aging Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <ArAgingTable
            rows={report.rows}
            bucketTotals={report.bucketTotals}
            grandTotalMinor={report.grandTotalMinor}
            currencyCode={report.currencyCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
