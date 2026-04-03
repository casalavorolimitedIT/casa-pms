import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordLinenTransaction, getLinenContext } from "./actions";

type LinenPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LinenPage({ searchParams }: LinenPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getLinenContext(activePropertyId);

  const totals = new Map<string, { sent: number; returned: number; damaged: number }>();
  for (const row of context.transactions) {
    const key = row.room_type_id ?? "unknown";
    if (!totals.has(key)) totals.set(key, { sent: 0, returned: 0, damaged: 0 });
    const bucket = totals.get(key)!;
    if (row.txn_type === "sent") bucket.sent += row.quantity;
    if (row.txn_type === "returned") bucket.returned += row.quantity;
    if (row.txn_type === "damaged") bucket.damaged += row.quantity;
  }

  const submitAction = async (formData: FormData) => {
    "use server";
    const result = await recordLinenTransaction(formData);
    if (result?.success) redirect(`/dashboard/linen?ok=${encodeURIComponent("Linen transaction recorded.")}`);
    redirect(`/dashboard/linen?error=${encodeURIComponent(result?.error ?? "Unable to record transaction.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Linen Tracking</h1>
          <p className="page-subtitle">Track sent, returned, and damaged linen with outstanding reconciliation by room type.</p>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Record Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitAction} className="grid gap-3 lg:grid-cols-5">
              <input type="hidden" name="propertyId" value={activePropertyId} />

              <div className="grid gap-1.5">
                <Label>Room Type</Label>
                <FormSelectField
                  name="roomTypeId"
                  placeholder="Optional"
                  options={context.roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Type</Label>
                <FormSelectField
                  name="txnType"
                  defaultValue="sent"
                  options={[
                    { value: "sent", label: "Sent" },
                    { value: "returned", label: "Returned" },
                    { value: "damaged", label: "Damaged" },
                  ]}
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Quantity</Label>
                <Input type="number" min={1} name="quantity" defaultValue={1} />
              </div>

              <div className="grid gap-1.5 lg:col-span-2">
                <Label>Note</Label>
                <Input name="note" placeholder="Laundry batch #, incident note, etc." />
              </div>

              <div className="lg:col-span-5">
                <FormSubmitButton idleText="Record" pendingText="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Outstanding Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.from(totals.entries()).length === 0 ? (
                <p className="text-sm text-zinc-500">No movements yet.</p>
              ) : (
                <ul className="space-y-2">
                  {Array.from(totals.entries()).map(([roomTypeId, row]) => {
                    const name = context.roomTypes.find((rt) => rt.id === roomTypeId)?.name ?? "Unassigned";
                    const outstanding = row.sent - row.returned;
                    return (
                      <li key={roomTypeId} className="rounded-lg border border-zinc-200 p-3 text-sm">
                        <p className="font-medium text-zinc-900">{name}</p>
                        <p className="text-zinc-600">Sent {row.sent} · Returned {row.returned} · Damaged {row.damaged}</p>
                        <p className={`font-medium ${outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                          Outstanding: {outstanding}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Recent Movements</CardTitle>
            </CardHeader>
            <CardContent>
              {context.transactions.length === 0 ? (
                <p className="text-sm text-zinc-500">No transactions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {context.transactions.slice(0, 40).map((txn) => {
                    const roomTypeRaw = txn.room_types as { name?: string } | Array<{ name?: string }> | null;
                    const roomType = Array.isArray(roomTypeRaw) ? roomTypeRaw[0] : roomTypeRaw;
                    return (
                      <li key={txn.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                        <p className="font-medium text-zinc-900">
                          {txn.txn_type.toUpperCase()} · {txn.quantity}
                        </p>
                        <p className="text-zinc-600">{roomType?.name ?? "Unassigned"}</p>
                        <p className="text-xs text-zinc-500">{new Date(txn.created_at).toLocaleString()}</p>
                        {txn.note ? <p className="text-xs text-zinc-500">{txn.note}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
