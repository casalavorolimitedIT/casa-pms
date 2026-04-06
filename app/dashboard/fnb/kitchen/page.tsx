import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { bumpTicket, confirmOrder, getKitchenQueue, markItemReady, markTicketComplete } from "../actions";

type KitchenPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function KitchenPage({ searchParams }: KitchenPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to open kitchen queue.</div>;
  }

  const canManage = await hasPermission(propertyId, "minibar.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20kitchen%20queue");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const { queue } = await getKitchenQueue(propertyId);

  const confirmAction = async (formData: FormData) => {
    "use server";
    const result = await confirmOrder(formData);
    if (result?.success) redirect("/dashboard/fnb/kitchen?ok=Ticket%20confirmed");
    redirect(`/dashboard/fnb/kitchen?error=${encodeURIComponent(result?.error ?? "Unable to confirm ticket")}`);
  };

  const bumpAction = async (formData: FormData) => {
    "use server";
    const result = await bumpTicket(formData);
    if (result?.success) redirect("/dashboard/fnb/kitchen?ok=Ticket%20moved%20to%20in-progress");
    redirect(`/dashboard/fnb/kitchen?error=${encodeURIComponent(result?.error ?? "Unable to bump ticket")}`);
  };

  const itemReadyAction = async (formData: FormData) => {
    "use server";
    const result = await markItemReady(formData);
    if (result?.success) redirect("/dashboard/fnb/kitchen?ok=Item%20marked%20ready");
    redirect(`/dashboard/fnb/kitchen?error=${encodeURIComponent(result?.error ?? "Unable to mark item ready")}`);
  };

  const completeAction = async (formData: FormData) => {
    "use server";
    const result = await markTicketComplete(formData);
    if (result?.success) redirect("/dashboard/fnb/kitchen?ok=Ticket%20completed");
    const message = result && "error" in result ? result.error : "Unable to complete ticket";
    redirect(`/dashboard/fnb/kitchen?error=${encodeURIComponent(message)}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Kitchen Display Queue</h1>
          <p className="page-subtitle">Real-time ticket execution from queued to ready and completed.</p>
        </div>

        <Card className="glass-panel mt-8">
          <CardHeader><CardTitle className="text-base">Open Tickets</CardTitle></CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <p className="text-sm text-zinc-500">No open tickets.</p>
            ) : (
              <ul className="space-y-3">
                {queue.map((ticket) => {
                  const outletRaw = ticket.outlets as { name?: string } | Array<{ name?: string }> | null;
                  const outlet = Array.isArray(outletRaw) ? outletRaw[0] : outletRaw;
                  const items = (ticket.order_items as Array<{ id: string; item_name: string; quantity: number; status: string }>) ?? [];

                  return (
                    <li key={ticket.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-zinc-900">{ticket.ticket_number || ticket.id.slice(0, 8)}</p>
                          <p className="text-xs text-zinc-500">
                            {outlet?.name ?? "Outlet"} · {ticket.status} · {new Date(ticket.created_at).toLocaleTimeString("en-GB")}
                            {ticket.guest_name ? ` · ${ticket.guest_name}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <form action={confirmAction}>
                            <input type="hidden" name="orderId" value={ticket.id} />
                            <FormSubmitButton idleText="Confirm" pendingText="..." size="sm" variant="outline" />
                          </form>
                          <form action={bumpAction}>
                            <input type="hidden" name="orderId" value={ticket.id} />
                            <FormSubmitButton idleText="Bump" pendingText="..." size="sm" variant="outline" />
                          </form>
                          <form action={completeAction} className="flex items-center gap-2">
                            <input type="hidden" name="orderId" value={ticket.id} />
                            <label className="text-xs text-zinc-600 flex items-center gap-1">
                              <input name="postToFolio" type="checkbox" className="h-3.5 w-3.5" /> Post to folio
                            </label>
                            <FormSubmitButton idleText="Complete" pendingText="..." size="sm" />
                          </form>
                        </div>
                      </div>

                      <div className="mt-2 space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                            <p className="text-sm text-zinc-800">{item.quantity}x {item.item_name} <span className="text-xs text-zinc-500">({item.status})</span></p>
                            <form action={itemReadyAction}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <FormSubmitButton idleText="Mark ready" pendingText="..." size="sm" variant="outline" />
                            </form>
                          </div>
                        ))}
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
