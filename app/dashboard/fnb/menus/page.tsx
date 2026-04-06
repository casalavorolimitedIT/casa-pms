import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { WorkflowStepperSheet } from "@/components/custom/workflow-stepper-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Badge } from "@/components/ui/badge";
import { FnbMenuItemMedia } from "@/components/custom/fnb-menu-item-media";
import {
  createMenuCategory,
  createMenuItem,
  createModifier,
  createOutlet,
  getMenuManagementContext,
  updateMenuItemPrice,
} from "./actions";

type MenusPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FnbMenusPage({ searchParams }: MenusPageProps) {
  await redirectIfNotAuthenticated();

  const propertyId = await getActivePropertyId();
  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage F and B menus.</div>;
  }

  const canManage = await hasPermission(propertyId, "minibar.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20manage%20menus");
  }

  const params = (await searchParams) ?? {};
  const ok = first(params.ok);
  const error = first(params.error);

  const context = await getMenuManagementContext(propertyId);

  const outletOptions = context.outlets.map((outlet) => ({
    value: outlet.id,
    label: outlet.name,
  }));

  const categoryOptions = context.categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const itemOptions = context.items.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const createOutletAction = async (formData: FormData) => {
    "use server";
    const result = await createOutlet(formData);
    if (result?.success) {
      redirect("/dashboard/fnb/menus?ok=Outlet%20created");
    }
    redirect(`/dashboard/fnb/menus?error=${encodeURIComponent(result?.error ?? "Unable to create outlet")}`);
  };

  const createCategoryAction = async (formData: FormData) => {
    "use server";
    const result = await createMenuCategory(formData);
    if (result?.success) {
      redirect("/dashboard/fnb/menus?ok=Category%20created");
    }
    redirect(`/dashboard/fnb/menus?error=${encodeURIComponent(result?.error ?? "Unable to create category")}`);
  };

  const createItemAction = async (formData: FormData) => {
    "use server";
    const result = await createMenuItem(formData);
    if (result?.success) {
      redirect("/dashboard/fnb/menus?ok=Menu%20item%20created");
    }
    redirect(`/dashboard/fnb/menus?error=${encodeURIComponent(result?.error ?? "Unable to create menu item")}`);
  };

  const createModifierAction = async (formData: FormData) => {
    "use server";
    const result = await createModifier(formData);
    if (result?.success) {
      redirect("/dashboard/fnb/menus?ok=Modifier%20created");
    }
    redirect(`/dashboard/fnb/menus?error=${encodeURIComponent(result?.error ?? "Unable to create modifier")}`);
  };

  const updatePriceAction = async (formData: FormData) => {
    "use server";
    const result = await updateMenuItemPrice(formData);
    if (result?.success) {
      redirect("/dashboard/fnb/menus?ok=Outlet%20price%20updated");
    }
    redirect(`/dashboard/fnb/menus?error=${encodeURIComponent(result?.error ?? "Unable to update outlet price")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title">F and B Menu Management</h1>
            <p className="page-subtitle">Configure outlets, categories, menu items, modifiers, and outlet-specific prices.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="F and B menu management"
            summary="This page builds the structured menu graph used by POS and ordering channels."
            responsibilities={[
              "Create outlets and category structures for menu organization.",
              "Create sellable items and attach optional modifiers.",
              "Maintain outlet-level price overrides for channel consistency.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/fnb/inventory",
                label: "F and B Inventory",
                description: "Inventory and menu definitions should stay aligned.",
              },
            ]}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Metric title="Outlets" value={context.outlets.length} />
          <Metric title="Categories" value={context.categories.length} />
          <Metric title="Menu Items" value={context.items.length} />
          <Metric title="Modifiers" value={context.modifiers.length} />
          <Metric title="Outlet Prices" value={context.outletPrices.length} />
        </div>

        <Card className="glass-panel mt-8 border-zinc-200/80 bg-linear-to-br from-white via-zinc-50/70 to-white">
          <CardHeader><CardTitle className="text-base">Menu Configuration Workflow</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">Build outlets, categories, items, and modifiers in one guided flow.</p>
              <p className="text-sm text-zinc-600">Progress and inputs are restored automatically if you close and reopen the workflow.</p>
            </div>
            <WorkflowStepperSheet
              title="F and B Menu Setup"
              description="Run the full menu setup path without hopping between separate cards."
              triggerLabel="Open menu workflow"
              memoryKey="fnb-menu-workflow"
              steps={[
                { title: "Create outlet", description: "Set service point and description." },
                { title: "Create category", description: "Structure menu groups." },
                { title: "Create item", description: "Define item and base sales values." },
                { title: "Create modifier", description: "Attach upsells and constraints." },
                { title: "Set outlet price", description: "Apply location-specific overrides." },
              ]}
            >
              <div className="grid gap-6">
                <section data-workflow-step="1" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create outlet</h2>
                  </div>
                  <form action={createOutletAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-outletName">Outlet Name</Label>
                      <Input id="wf-outletName" name="name" placeholder="Pool Bar" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-outletDescription">Description</Label>
                      <Input id="wf-outletDescription" name="description" placeholder="Optional" />
                    </div>
                    <FormSubmitButton idleText="Create outlet" pendingText="Creating..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section data-workflow-step="2" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create menu category</h2>
                  </div>
                  <form action={createCategoryAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-categoryOutlet">Outlet</Label>
                      <FormSelectField name="outletId" options={outletOptions} placeholder="Optional (global category)" emptyStateText="Create an outlet first" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-categoryName">Category Name</Label>
                      <Input id="wf-categoryName" name="name" placeholder="Starters" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-categorySort">Sort Order</Label>
                      <Input id="wf-categorySort" name="sortOrder" type="number" min={0} max={999} defaultValue={0} />
                    </div>
                    <FormSubmitButton idleText="Create category" pendingText="Creating..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section data-workflow-step="3" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create menu item</h2>
                  </div>
                  <form action={createItemAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-itemOutlet">Outlet</Label>
                      <FormSelectField name="outletId" options={outletOptions} placeholder="Select outlet" emptyStateText="Create an outlet first" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-itemCategory">Category</Label>
                      <FormSelectField name="categoryId" options={categoryOptions} placeholder="Optional" emptyStateText="No categories yet" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-itemName">Item Name</Label>
                      <Input id="wf-itemName" name="name" placeholder="Grilled Salmon" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-itemDescription">Description</Label>
                      <Input id="wf-itemDescription" name="description" placeholder="Optional" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-basePriceMinor">Base Price (minor units)</Label>
                      <Input id="wf-basePriceMinor" name="basePriceMinor" type="number" min={0} required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="wf-availableFrom">Available From</Label>
                        <Input id="wf-availableFrom" name="availableFrom" type="time" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="wf-availableTo">Available To</Label>
                        <Input id="wf-availableTo" name="availableTo" type="time" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" /> Active item
                    </label>
                    <FormSubmitButton idleText="Create item" pendingText="Creating..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section data-workflow-step="4" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">4</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create modifier</h2>
                  </div>
                  <form action={createModifierAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-modifierItem">Menu Item</Label>
                      <FormSelectField name="menuItemId" options={itemOptions} placeholder="Select item" emptyStateText="Create a menu item first" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-modifierName">Modifier Name</Label>
                      <Input id="wf-modifierName" name="name" placeholder="Extra Cheese" required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="wf-priceDeltaMinor">Price Delta</Label>
                        <Input id="wf-priceDeltaMinor" name="priceDeltaMinor" type="number" defaultValue={0} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="wf-maxSelect">Max Select</Label>
                        <Input id="wf-maxSelect" name="maxSelect" type="number" min={1} max={20} defaultValue={1} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="wf-modifierSort">Sort</Label>
                        <Input id="wf-modifierSort" name="sortOrder" type="number" min={0} defaultValue={0} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input name="isRequired" type="checkbox" className="h-4 w-4" /> Required
                    </label>
                    <FormSubmitButton idleText="Create modifier" pendingText="Creating..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section data-workflow-step="5" className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">5</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Set outlet-specific price override</h2>
                  </div>
                  <form action={updatePriceAction} className="grid gap-3 md:grid-cols-4 md:items-end">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-priceOutlet">Outlet</Label>
                      <FormSelectField name="outletId" options={outletOptions} placeholder="Select outlet" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-priceItem">Menu Item</Label>
                      <FormSelectField name="menuItemId" options={itemOptions} placeholder="Select item" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-priceMinor">Override Price (minor)</Label>
                      <Input id="wf-priceMinor" name="priceMinor" type="number" min={0} required />
                    </div>
                    <FormSubmitButton idleText="Save outlet price" pendingText="Saving..." className="w-full md:w-auto" />
                  </form>
                </section>
              </div>
            </WorkflowStepperSheet>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Current Menu Snapshot</CardTitle></CardHeader>
          <CardContent>
            {context.items.length === 0 ? (
              <p className="text-sm text-zinc-500">No menu items yet.</p>
            ) : (
              <div className="space-y-2">
                {context.items.map((item) => {
                  const outlet = context.outlets.find((o) => o.id === item.outlet_id);
                  const category = context.categories.find((c) => c.id === item.category_id);
                  const mods = context.modifiers.filter((m) => m.menu_item_id === item.id);
                  const overrides = context.outletPrices.filter((p) => p.menu_item_id === item.id);

                  return (
                    <div key={item.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">
                            {outlet?.name ?? "Unknown outlet"}
                            {category ? ` · ${category.name}` : ""}
                            {` · base ${item.base_price_minor}`}
                          </p>
                        </div>
                        <Badge variant={item.is_active ? "outline" : "secondary"}>
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {mods.length} modifier(s) · {overrides.length} outlet override(s)
                      </p>
                      <FnbMenuItemMedia
                        propertyId={propertyId}
                        menuItemId={item.id}
                        menuItemName={item.name}
                      />
                    </div>
                  );
                })}
              </div>
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
