import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import {
  generateAuditReportAction,
  getNightAuditHistory,
  postRoomChargesAction,
  runNightAuditAction,
  runNoShowLogicAction,
} from "./actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function businessDateToday() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NightAuditPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const history = await getNightAuditHistory(activePropertyId);
  const businessDate = businessDateToday();

  return (
    <div className="page-shell">
      <div className="page-container">
      <div className="space-y-1">
        <h1 className="page-title text-balance tracking-tight">Night Audit</h1>
        <p className="page-subtitle">Run close-of-day posting, no-show logic, discrepancy detection, and revenue snapshots.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Audit Wizard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="page-subtitle">Business date: {businessDate}</p>

            <form
              action={async () => {
                "use server";
                await postRoomChargesAction({ propertyId: activePropertyId, businessDate });
              }}
            >
              <FormSubmitButton idleText="Step 1 • Post Room Charges" pendingText="Posting charges…" variant="outline" className="w-full justify-start" />
            </form>

            <form
              action={async () => {
                "use server";
                await runNoShowLogicAction({ propertyId: activePropertyId, businessDate });
              }}
            >
              <FormSubmitButton idleText="Step 2 • Run No-show Logic" pendingText="Running no-show logic…" variant="outline" className="w-full justify-start" />
            </form>

            <form
              action={async () => {
                "use server";
                await generateAuditReportAction({ propertyId: activePropertyId, businessDate });
              }}
            >
              <FormSubmitButton idleText="Step 3 • Detect Discrepancies" pendingText="Detecting discrepancies…" variant="outline" className="w-full justify-start" />
            </form>

            <form
              action={async () => {
                "use server";
                await runNightAuditAction({ propertyId: activePropertyId, businessDate });
              }}
            >
              <FormSubmitButton idleText="Run Full Night Audit" pendingText="Running audit…" className="w-full" />
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Recent Revenue Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            {history.snapshots.length === 0 ? (
              <p className="page-subtitle">No snapshots yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.snapshots.map((snapshot) => (
                  <li key={snapshot.business_date} className="rounded-md border border-zinc-200 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-900">{snapshot.business_date}</span>
                      <span className="text-zinc-500">{new Date(snapshot.created_at).toLocaleString("en-GB")}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border border-zinc-200 px-2 py-1">
                        <p className="text-zinc-500">Room Revenue</p>
                        <p className="font-semibold text-zinc-900">{formatCurrencyMinor(snapshot.room_revenue_minor, "USD")}</p>
                      </div>
                      <div className="rounded-md border border-zinc-200 px-2 py-1">
                        <p className="text-zinc-500">Non-room Revenue</p>
                        <p className="font-semibold text-zinc-900">{formatCurrencyMinor(snapshot.non_room_revenue_minor, "USD")}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-base">Audit Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.runs.length === 0 ? (
            <p className="page-subtitle">No audit runs found.</p>
          ) : (
            <ul className="space-y-2">
              {history.runs.map((run) => (
                <li key={run.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900">{run.business_date}</p>
                    <p className="text-xs text-zinc-500">{new Date(run.created_at).toLocaleString("en-GB")}</p>
                  </div>
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs capitalize text-zinc-700">{run.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
