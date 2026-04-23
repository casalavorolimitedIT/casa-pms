import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId, getActivePropertyCurrency } from "@/lib/pms/property-context";
import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { redirect } from "next/navigation";
import {
  generateAuditReportAction,
  getNightAuditHistory,
  postRoomChargesAction,
  runNightAuditAction,
  runNoShowLogicAction,
} from "./actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";

function businessDateToday() {
  return new Date().toISOString().slice(0, 10);
}

function readSearchValue(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type NightAuditPageProps = {
  searchParams?: Promise<{
    s1?: string | string[];
    s2?: string | string[];
    s3?: string | string[];
    ok?: string | string[];
    error?: string | string[];
  }>;
};

export default async function NightAuditPage({ searchParams }: NightAuditPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const s1Done = !!readSearchValue(params.s1);
  const s2Done = !!readSearchValue(params.s2);
  const s3Done = !!readSearchValue(params.s3);
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const [history, currencyCode] = await Promise.all([
    getNightAuditHistory(activePropertyId),
    getActivePropertyCurrency(),
  ]);
  const businessDate = businessDateToday();

  // Check if today's audit already ran
  const todayRan = history.runs.some((r) => r.business_date === businessDate && r.status === "completed");

  const step1Action = async () => {
    "use server";
    try {
      await postRoomChargesAction({ propertyId: activePropertyId, businessDate });
      redirect(`/dashboard/night-audit?s1=done`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Step 1 failed.";
      redirect(`/dashboard/night-audit?error=${encodeURIComponent(msg)}`);
    }
  };

  const step2Action = async () => {
    "use server";
    try {
      await runNoShowLogicAction({ propertyId: activePropertyId, businessDate });
      redirect(`/dashboard/night-audit?s1=done&s2=done`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Step 2 failed.";
      redirect(`/dashboard/night-audit?s1=done&error=${encodeURIComponent(msg)}`);
    }
  };

  const step3Action = async () => {
    "use server";
    try {
      await generateAuditReportAction({ propertyId: activePropertyId, businessDate });
      redirect(`/dashboard/night-audit?s1=done&s2=done&s3=done`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Step 3 failed.";
      redirect(`/dashboard/night-audit?s1=done&s2=done&error=${encodeURIComponent(msg)}`);
    }
  };

  const fullAuditAction = async () => {
    "use server";
    try {
      await runNightAuditAction({ propertyId: activePropertyId, businessDate });
      redirect(`/dashboard/night-audit?ok=${encodeURIComponent("Night audit completed for " + businessDate + ".")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Full audit failed.";
      redirect(`/dashboard/night-audit?error=${encodeURIComponent(msg)}`);
    }
  };

  const steps = [
    { label: "Post Room Charges", action: step1Action, done: s1Done, enabled: true },
    { label: "Run No-show Logic", action: step2Action, done: s2Done, enabled: s1Done },
    { label: "Detect Discrepancies", action: step3Action, done: s3Done, enabled: s2Done },
  ] as const;

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />
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
              <p className="page-subtitle">Business date: <strong className="text-zinc-900">{businessDate}</strong></p>

              {todayRan && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Audit already completed for today.
                </div>
              )}

              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700"
                      : step.enabled
                      ? "bg-blue-100 text-blue-700"
                      : "bg-zinc-100 text-zinc-400"
                  }`}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <form action={step.action} className="flex-1">
                    <FormSubmitButton
                      idleText={`Step ${i + 1} \u2022 ${step.label}`}
                      pendingText="Running\u2026"
                      variant={step.done ? "ghost" : "outline"}
                      className={`w-full justify-start ${step.done ? "text-emerald-700 opacity-70" : ""}`}
                      disabled={!step.enabled || step.done || todayRan}
                    />
                  </form>
                </div>
              ))}

              <div className="border-t border-zinc-200 pt-3">
                <form action={fullAuditAction}>
                  <FormSubmitButton
                    idleText="Run Full Night Audit"
                    pendingText="Running audit\u2026"
                    className="w-full"
                    disabled={!s3Done || todayRan}
                  />
                </form>
                {!s3Done && !todayRan && (
                  <p className="mt-2 text-xs text-zinc-500">Complete steps 1\u20133 first, or use express mode below.</p>
                )}
              </div>

              <details className="rounded-lg border border-zinc-200 p-3 text-sm">
                <summary className="cursor-pointer font-medium text-zinc-700">Express: skip steps, run everything at once</summary>
                <div className="mt-3">
                  <form action={fullAuditAction}>
                    <FormSubmitButton
                      idleText="Express Night Audit"
                      pendingText="Running audit\u2026"
                      variant="outline"
                      className="w-full"
                      disabled={todayRan}
                    />
                  </form>
                </div>
              </details>
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
                          <p className="font-semibold text-zinc-900">{formatCurrencyMinor(snapshot.room_revenue_minor, currencyCode)}</p>
                        </div>
                        <div className="rounded-md border border-zinc-200 px-2 py-1">
                          <p className="text-zinc-500">Non-room Revenue</p>
                          <p className="font-semibold text-zinc-900">{formatCurrencyMinor(snapshot.non_room_revenue_minor, currencyCode)}</p>
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
                    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${run.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-700"}`}>
                      {run.status}
                    </span>
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
