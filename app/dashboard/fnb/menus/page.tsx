import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Badge } from "@/components/ui/badge";
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

        <div className="space-y-1">
          <h1 className="page-title">F and B Menu Management</h1>
          <p className="page-subtitle">Configure outlets, categories, menu items, modifiers, and outlet-specific prices.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Metric title="Outlets" value={context.outlets.length} />
          <Metric title="Categories" value={context.categories.length} />
          <Metric title="Menu Items" value={context.items.length} />
          <Metric title="Modifiers" value={context.modifiers.length} />
          <Metric title="Outlet Prices" value={context.outletPrices.length} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Outlet</CardTitle></CardHeader>
            <CardContent>
              <form action={createOutletAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="outletName">Outlet Name</Label>
                  <Input id="outletName" name="name" placeholder="Pool Bar" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="outletDescription">Description</Label>
                  <Input id="outletDescription" name="description" placeholder="Optional" />
                </div>
                <FormSubmitButton idleText="Create outlet" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Menu Category</CardTitle></CardHeader>
            <CardContent>
              <form action={createCategoryAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="categoryOutlet">Outlet</Label>
                  <FormSelectField
                    name="outletId"
                    options={outletOptions}
                    placeholder="Optional (global category)"
                    emptyStateText="Create an outlet first"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input id="categoryName" name="name" placeholder="Starters" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categorySort">Sort Order</Label>
                  <Input id="categorySort" name="sortOrder" type="number" min={0} max={999} defaultValue={0} />
                </div>
                <FormSubmitButton idleText="Create category" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Menu Item</CardTitle></CardHeader>
            <CardContent>
              <form action={createItemAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="itemOutlet">Outlet</Label>
                  <FormSelectField name="outletId" options={outletOptions} placeholder="Select outlet" emptyStateText="Create an outlet first" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="itemCategory">Category</Label>
                  <FormSelectField name="categoryId" options={categoryOptions} placeholder="Optional" emptyStateText="No categories yet" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input id="itemName" name="name" placeholder="Grilled Salmon" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="itemDescription">Description</Label>
                  <Input id="itemDescription" name="description" placeholder="Optional" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="basePriceMinor">Base Price (minor units)</Label>
                  <Input id="basePriceMinor" name="basePriceMinor" type="number" min={0} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="availableFrom">Available From</Label>
                    <Input id="availableFrom" name="availableFrom" type="time" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="availableTo">Available To</Label>
                    <Input id="availableTo" name="availableTo" type="time" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" /> Active item
                </label>
                <FormSubmitButton idleText="Create item" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader><CardTitle className="text-base">Create Modifier</CardTitle></CardHeader>
            <CardContent>
              <form action={createModifierAction} className="grid gap-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <div className="grid gap-2">
                  <Label htmlFor="modifierItem">Menu Item</Label>
                  <FormSelectField name="menuItemId" options={itemOptions} placeholder="Select item" emptyStateText="Create a menu item first" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="modifierName">Modifier Name</Label>
                  <Input id="modifierName" name="name" placeholder="Extra Cheese" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="priceDeltaMinor">Price Delta</Label>
                    <Input id="priceDeltaMinor" name="priceDeltaMinor" type="number" defaultValue={0} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxSelect">Max Select</Label>
                    <Input id="maxSelect" name="maxSelect" type="number" min={1} max={20} defaultValue={1} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="modifierSort">Sort</Label>
                    <Input id="modifierSort" name="sortOrder" type="number" min={0} defaultValue={0} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input name="isRequired" type="checkbox" className="h-4 w-4" /> Required
                </label>
                <FormSubmitButton idleText="Create modifier" pendingText="Creating..." className="w-full sm:w-auto" />
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Outlet-Specific Price Override</CardTitle></CardHeader>
          <CardContent>
            <form action={updatePriceAction} className="grid gap-3 md:grid-cols-4 md:items-end">
              <input type="hidden" name="propertyId" value={propertyId} />
              <div className="grid gap-2">
                <Label htmlFor="priceOutlet">Outlet</Label>
                <FormSelectField name="outletId" options={outletOptions} placeholder="Select outlet" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceItem">Menu Item</Label>
                <FormSelectField name="menuItemId" options={itemOptions} placeholder="Select item" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceMinor">Override Price (minor)</Label>
                <Input id="priceMinor" name="priceMinor" type="number" min={0} required />
              </div>
              <FormSubmitButton idleText="Save outlet price" pendingText="Saving..." className="w-full md:w-auto" />
            </form>
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
