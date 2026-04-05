import { formatCurrencyMinor } from "@/lib/pms/formatting";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { addCashDrawerEntry, closeShift, getCashierContext, openShift } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

function toMinorUnits(value: FormDataEntryValue | null) {
  const asNumber = Number(value ?? 0);
  if (Number.isNaN(asNumber)) return 0;
  return Math.round(asNumber * 100);
}

export default async function CashierPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getCashierContext(activePropertyId);

  const signedEntriesTotal = context.entries.reduce((sum, entry) => {
    const delta = entry.entry_type === "cash_out" ? -Math.abs(entry.amount_minor) : Math.abs(entry.amount_minor);
    return sum + delta;
  }, 0);

  const expectedCashMinor = (context.activeShift?.opening_float_minor ?? 0) + signedEntriesTotal;
  const varianceMinor = (context.activeShift?.closing_count_minor ?? expectedCashMinor) - expectedCashMinor;

  return (
    <div className="page-shell">
      <div className="page-container">
      <div className="space-y-1">
        <h1 className="page-title text-balance tracking-tight">Cash Drawer / Shift</h1>
        <p className="page-subtitle">Open shift, register live cash entries, and close with expected vs actual variance.</p>
      </div>

      {!context.activeShift ? (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Open Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              action={async (formData) => {
                "use server";
                const payload = new FormData();
                payload.set("propertyId", activePropertyId);
                payload.set("openingFloatMinor", String(toMinorUnits(formData.get("openingFloat"))));
                await openShift(payload);
              }}
            >
              <label className="grid gap-1 text-sm">
                Opening Float (USD)
                <input
                  name="openingFloat"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0.00"
                  className="h-9 rounded-md border border-zinc-300 px-2"
                />
              </label>
              <FormSubmitButton idleText="Open Shift" pendingText="Opening…" />
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-zinc-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">Opening Float</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold text-zinc-900">{formatCurrencyMinor(context.activeShift.opening_float_minor, "USD")}</p></CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">Expected Cash</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold text-zinc-900">{formatCurrencyMinor(expectedCashMinor, "USD")}</p></CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">Variance</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-semibold ${varianceMinor === 0 ? "text-zinc-900" : "text-amber-700"}`}>{formatCurrencyMinor(varianceMinor, "USD")}</p></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Live Transaction Register</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  action={async (formData) => {
                    "use server";
                    const payload = new FormData();
                    payload.set("shiftId", context.activeShift!.id);
                    payload.set("entryType", String(formData.get("entryType") ?? "cash_in"));
                    payload.set("amountMinor", String(toMinorUnits(formData.get("amount"))));
                    await addCashDrawerEntry(payload);
                  }}
                >
                  <select aria-label="Entry type" name="entryType" defaultValue="cash_in" className="h-9 rounded-md border border-zinc-300 px-2 text-sm">
                    <option value="cash_in">Cash In</option>
                    <option value="cash_out">Cash Out</option>
                  </select>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                  />
                  <FormSubmitButton idleText="Post" pendingText="Posting…" />
                </form>

                {context.entries.length === 0 ? (
                  <p className="page-subtitle">No entries yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {context.entries.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-2 text-sm">
                        <div>
                          <p className="font-medium capitalize text-zinc-900">{entry.entry_type.replace("_", " ")}</p>
                          <p className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleString("en-GB")}</p>
                        </div>
                        <p className={entry.entry_type === "cash_out" ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                          {entry.entry_type === "cash_out" ? "-" : "+"}
                          {formatCurrencyMinor(Math.abs(entry.amount_minor), "USD")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Close Shift</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="page-subtitle">
                  Expected cash at close: <span className="font-medium text-zinc-900">{formatCurrencyMinor(expectedCashMinor, "USD")}</span>
                </p>

                <form
                  className="flex flex-wrap items-end gap-3"
                  action={async (formData) => {
                    "use server";
                    const payload = new FormData();
                    payload.set("shiftId", context.activeShift!.id);
                    payload.set("closingCountMinor", String(toMinorUnits(formData.get("closingCount"))));
                    await closeShift(payload);
                  }}
                >
                  <label className="grid gap-1 text-sm">
                    Actual Closing Count (USD)
                    <input
                      name="closingCount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(expectedCashMinor / 100).toFixed(2)}
                      className="h-9 rounded-md border border-zinc-300 px-2"
                    />
                  </label>
                  <FormSubmitButton idleText="Close Shift" pendingText="Closing…" variant="outline" />
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-base">Recent Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {context.recentShifts.length === 0 ? (
            <p className="page-subtitle">No shifts recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {context.recentShifts.map((shift) => {
                const isOpen = !shift.closed_at;
                return (
                  <li key={shift.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-3 text-sm">
                    <div>
                      <p className="font-medium text-zinc-900">{isOpen ? "Open Shift" : "Closed Shift"}</p>
                      <p className="text-xs text-zinc-500">
                        Opened: {new Date(shift.opened_at).toLocaleString("en-GB")}
                        {shift.closed_at ? ` • Closed: ${new Date(shift.closed_at).toLocaleString("en-GB")}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Opening</p>
                      <p className="font-semibold text-zinc-900">{formatCurrencyMinor(shift.opening_float_minor, "USD")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
