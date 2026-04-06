import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { WorkflowStepperSheet } from "@/components/custom/workflow-stepper-sheet";
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

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title">F and B Inventory</h1>
            <p className="page-subtitle">Track stock, record movements, manage purchase orders, and monitor low-stock alerts.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="F and B inventory"
            summary="This page controls stock integrity from corrections through procurement and receiving."
            responsibilities={[
              "Apply stock adjustments with operational references.",
              "Create purchase orders against inventory demand.",
              "Record receiving and monitor low-stock exceptions.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/fnb/menus",
                label: "F and B Menu Management",
                description: "Menu planning and inventory planning should stay aligned.",
              },
            ]}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric title="Inventory Items" value={context.items.length} />
          <Metric title="Open Alerts" value={context.alerts.length} />
          <Metric title="POs" value={context.purchaseOrders.length} />
          <Metric title="Movements" value={context.movements.length} />
        </div>

        <Card className="glass-panel mt-8 border-zinc-200/80 bg-linear-to-br from-white via-zinc-50/70 to-white">
          <CardHeader><CardTitle className="text-base">Inventory Workflow</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">Manage stock operations from one guided side panel.</p>
              <p className="text-sm text-zinc-600">Inputs and current step are restored automatically when you reopen.</p>
            </div>
            <WorkflowStepperSheet
              title="Inventory Operations"
              description="Run adjustment, PO creation, and receiving in one uninterrupted flow."
              triggerLabel="Open inventory workflow"
              memoryKey="fnb-inventory-workflow"
              steps={[
                { title: "Adjust stock", description: "Record corrections and ad hoc changes." },
                { title: "Create purchase order", description: "Create demand-backed supplier orders." },
                { title: "Receive purchase order", description: "Post inbound quantities to stock." },
              ]}
            >
              <div className="grid gap-6">
                <section data-workflow-step="1" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Adjust stock</h2>
                  </div>
                  <form action={adjustAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-adjustItem">Item</Label>
                      <FormSelectField name="itemId" options={itemOptions} placeholder="Select item" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-qtyDelta">Quantity Delta (+/-)</Label>
                      <Input id="wf-qtyDelta" name="qtyDelta" type="number" step="0.01" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-reference">Reference</Label>
                      <Input id="wf-reference" name="reference" placeholder="Cycle count / correction ticket" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-notes">Notes</Label>
                      <Input id="wf-notes" name="notes" placeholder="Optional" />
                    </div>
                    <FormSubmitButton idleText="Apply adjustment" pendingText="Saving..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section data-workflow-step="2" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create purchase order</h2>
                  </div>
                  <form action={createPoAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-supplier">Supplier</Label>
                      <Input id="wf-supplier" name="supplier" placeholder="Fresh Foods Ltd" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-expectedAt">Expected Date</Label>
                      <FormDateTimeField name="expectedAt" includeTime={false} placeholder="Select date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-poItem">Item</Label>
                      <FormSelectField name="itemId" options={itemOptions} placeholder="Select item" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-qtyOrdered">Qty Ordered</Label>
                      <Input id="wf-qtyOrdered" name="qtyOrdered" type="number" step="0.01" min={0.01} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-costMinor">Cost (minor units)</Label>
                      <Input id="wf-costMinor" name="costMinor" type="number" min={0} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-poNotes">Notes</Label>
                      <Input id="wf-poNotes" name="notes" placeholder="Optional" />
                    </div>
                    <FormSubmitButton idleText="Create PO" pendingText="Creating..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section data-workflow-step="3" className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Receive purchase order</h2>
                  </div>
                  <form action={receivePoAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-receivePo">Purchase Order</Label>
                      <FormSelectField name="purchaseOrderId" options={poOptions} placeholder="Select PO" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-receiveLine">PO Line</Label>
                      <FormSelectField name="lineId" options={poLineOptions} placeholder="Select line" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-qtyReceived">Qty Received</Label>
                      <Input id="wf-qtyReceived" name="qtyReceived" type="number" step="0.01" min={0.01} required />
                    </div>
                    <FormSubmitButton idleText="Record receiving" pendingText="Saving..." className="w-full sm:w-auto" />
                  </form>
                </section>
              </div>
            </WorkflowStepperSheet>
          </CardContent>
        </Card>

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
