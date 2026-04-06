import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  adjustStock,
  createPurchaseOrder,
  generateLowStockAlert,
  getInventoryContext,
  receivePurchaseOrder,
} from "./actions";

type InventoryPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FnbInventoryPage({ searchParams }: InventoryPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage inventory.</div>;
  }

  const canManage = await hasPermission(propertyId, "minibar.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20inventory");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getInventoryContext(propertyId);
  const itemOptions = context.items.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.current_qty} ${item.unit})`,
  }));

  const poLineOptions = context.purchaseOrderLines.map((line) => {
    const itemName = Array.isArray(line.inventory_items)
      ? line.inventory_items[0]?.name
      : line.inventory_items && typeof line.inventory_items === "object" && "name" in line.inventory_items
        ? (line.inventory_items as { name?: string }).name
        : undefined;
    return {
      value: line.id,
      label: `${itemName ?? "Item"} · ordered ${line.qty_ordered} · received ${line.qty_received}`,
    };
  });

  const poOptions = context.purchaseOrders.map((po) => ({
    value: po.id,
    label: `${po.supplier} · ${po.status}`,
  }));

  const adjustAction = async (formData: FormData) => {
    "use server";
    const result = await adjustStock(formData);
    if (result?.success) redirect("/dashboard/fnb/inventory?ok=Stock%20adjusted");
    redirect(`/dashboard/fnb/inventory?error=${encodeURIComponent(result?.error ?? "Unable to adjust stock")}`);
  };

  const createPoAction = async (formData: FormData) => {
    "use server";
    const result = await createPurchaseOrder(formData);
    if (result?.success) redirect("/dashboard/fnb/inventory?ok=Purchase%20order%20created");
    redirect(`/dashboard/fnb/inventory?error=${encodeURIComponent(result?.error ?? "Unable to create purchase order")}`);
  };

  const receivePoAction = async (formData: FormData) => {
    "use server";
    const result = await receivePurchaseOrder(formData);
    if (result?.success) redirect("/dashboard/fnb/inventory?ok=Receiving%20recorded");
    redirect(`/dashboard/fnb/inventory?error=${encodeURIComponent(result?.error ?? "Unable to record receiving")}`);
  };

  const alertAction = async (formData: FormData) => {
    "use server";
    const result = await generateLowStockAlert(formData);
    if (result?.success) redirect("/dashboard/fnb/inventory?ok=Low-stock%20alert%20checked");
    redirect(`/dashboard/fnb/inventory?error=${encodeURIComponent(result?.error ?? "Unable to generate alert")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">F and B Inventory</h1>
          <p className="page-subtitle">Track stock, record movements, manage purchase orders, and monitor low-stock alerts.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric title="Inventory Items" value={context.items.length} />
          <Metric title="Open Alerts" value={context.alerts.length} />
          <Metric title="POs" value={context.purchaseOrders.length} />
          <Metric title="Movements" value={context.movements.length} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mt-8">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Adjust Stock</CardTitle></CardHeader>
            <CardContent>
              <form action={adjustAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="adjustItem">Item</Label>
                  <FormSelectField name="itemId" options={itemOptions} placeholder="Select item" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qtyDelta">Quantity Delta (+/-)</Label>
                  <Input id="qtyDelta" name="qtyDelta" type="number" step="0.01" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input id="reference" name="reference" placeholder="Cycle count / correction ticket" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" placeholder="Optional" />
                </div>
                <FormSubmitButton idleText="Apply adjustment" pendingText="Saving..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Purchase Order</CardTitle></CardHeader>
            <CardContent>
              <form action={createPoAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" name="supplier" placeholder="Fresh Foods Ltd" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedAt">Expected Date</Label>
                  <FormDateTimeField name="expectedAt" includeTime={false} placeholder="Select date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="poItem">Item</Label>
                  <FormSelectField name="itemId" options={itemOptions} placeholder="Select item" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qtyOrdered">Qty Ordered</Label>
                  <Input id="qtyOrdered" name="qtyOrdered" type="number" step="0.01" min={0.01} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costMinor">Cost (minor units)</Label>
                  <Input id="costMinor" name="costMinor" type="number" min={0} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="poNotes">Notes</Label>
                  <Input id="poNotes" name="notes" placeholder="Optional" />
                </div>
                <FormSubmitButton idleText="Create PO" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Receive Purchase Order</CardTitle></CardHeader>
            <CardContent>
              <form action={receivePoAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="receivePo">Purchase Order</Label>
                  <FormSelectField name="purchaseOrderId" options={poOptions} placeholder="Select PO" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="receiveLine">PO Line</Label>
                  <FormSelectField name="lineId" options={poLineOptions} placeholder="Select line" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qtyReceived">Qty Received</Label>
                  <Input id="qtyReceived" name="qtyReceived" type="number" step="0.01" min={0.01} required />
                </div>
                <FormSubmitButton idleText="Record receiving" pendingText="Saving..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Low-Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            {context.alerts.length === 0 ? (
              <p className="text-sm text-zinc-500">No open low-stock alerts.</p>
            ) : (
              <ul className="space-y-2">
                {context.alerts.map((alert) => {
                  const item = context.items.find((inventoryItem) => inventoryItem.id === alert.item_id);
                  return (
                    <li key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-amber-900">{item?.name ?? "Inventory item"}</p>
                          <p className="text-xs text-amber-800">{alert.message}</p>
                        </div>
                        <form action={alertAction}>
                          <input type="hidden" name="propertyId" value={propertyId} />
                          <input type="hidden" name="itemId" value={alert.item_id} />
                          <FormSubmitButton idleText="Re-check" pendingText="..." size="sm" variant="outline" />
                        </form>
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

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
