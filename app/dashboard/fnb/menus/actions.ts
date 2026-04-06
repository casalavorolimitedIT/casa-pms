"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";
import { requirePermission } from "@/lib/staff/server-permissions";

const OutletSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
});

const MenuCategorySchema = z.object({
  propertyId: z.string().uuid(),
  outletId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(120),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

const MenuItemSchema = z.object({
  propertyId: z.string().uuid(),
  outletId: z.string().uuid(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional().or(z.literal("")),
  basePriceMinor: z.coerce.number().int().min(0),
  availableFrom: z.string().optional().or(z.literal("")),
  availableTo: z.string().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

const ModifierSchema = z.object({
  propertyId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  name: z.string().min(1).max(120),
  priceDeltaMinor: z.coerce.number().int().min(-1000000).max(1000000).default(0),
  isRequired: z.coerce.boolean().default(false),
  maxSelect: z.coerce.number().int().min(1).max(20).default(1),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

const OutletPriceSchema = z.object({
  propertyId: z.string().uuid(),
  outletId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  priceMinor: z.coerce.number().int().min(0),
});

export async function createOutlet(formData: FormData) {
  const parsed = OutletSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid outlet input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const normalizedName = parsed.data.name.trim().replace(/\s+/g, " ");
  if (!normalizedName) {
    return { error: "Outlet name is required" };
  }

  const { error } = await supabase.from("outlets").insert({
    property_id: parsed.data.propertyId,
    name: normalizedName,
    description: parsed.data.description || null,
    is_active: true,
  });

  // Unique index on property+normalized name prevents accidental double-submit duplicates.
  if (error?.code === "23505") {
    revalidatePath("/dashboard/fnb/menus");
    return { success: true, duplicate: true };
  }

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/menus");
  return { success: true };
}

export async function createMenuCategory(formData: FormData) {
  const parsed = MenuCategorySchema.safeParse({
    propertyId: formData.get("propertyId"),
    outletId: formData.get("outletId"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const { error } = await supabase.from("menu_categories").insert({
    property_id: parsed.data.propertyId,
    outlet_id: parsed.data.outletId || null,
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/menus");
  return { success: true };
}

export async function createMenuItem(formData: FormData) {
  const parsed = MenuItemSchema.safeParse({
    propertyId: formData.get("propertyId"),
    outletId: formData.get("outletId"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description"),
    basePriceMinor: formData.get("basePriceMinor"),
    availableFrom: formData.get("availableFrom"),
    availableTo: formData.get("availableTo"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid menu item input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("menu_items")
    .insert({
      property_id: parsed.data.propertyId,
      outlet_id: parsed.data.outletId,
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      base_price_minor: parsed.data.basePriceMinor,
      available_from: parsed.data.availableFrom || null,
      available_to: parsed.data.availableTo || null,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Unable to create menu item" };

  revalidatePath("/dashboard/fnb/menus");
  return { success: true, itemId: data.id };
}

export async function createModifier(formData: FormData) {
  const parsed = ModifierSchema.safeParse({
    propertyId: formData.get("propertyId"),
    menuItemId: formData.get("menuItemId"),
    name: formData.get("name"),
    priceDeltaMinor: formData.get("priceDeltaMinor"),
    isRequired: formData.get("isRequired") === "on",
    maxSelect: formData.get("maxSelect"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid modifier input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const { error } = await supabase.from("menu_item_modifiers").insert({
    property_id: parsed.data.propertyId,
    menu_item_id: parsed.data.menuItemId,
    name: parsed.data.name,
    price_delta_minor: parsed.data.priceDeltaMinor,
    is_required: parsed.data.isRequired,
    max_select: parsed.data.maxSelect,
    sort_order: parsed.data.sortOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/menus");
  return { success: true };
}

export async function updateMenuItemPrice(formData: FormData) {
  const parsed = OutletPriceSchema.safeParse({
    propertyId: formData.get("propertyId"),
    outletId: formData.get("outletId"),
    menuItemId: formData.get("menuItemId"),
    priceMinor: formData.get("priceMinor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid outlet price input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("minibar.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("outlet_menu_item_prices")
    .upsert(
      {
        property_id: parsed.data.propertyId,
        outlet_id: parsed.data.outletId,
        menu_item_id: parsed.data.menuItemId,
        price_minor: parsed.data.priceMinor,
      },
      { onConflict: "outlet_id,menu_item_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/fnb/menus");
  return { success: true };
}

export async function getMenuManagementContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [outletsRes, categoriesRes, itemsRes, modifiersRes, pricesRes] = await Promise.all([
    supabase
      .from("outlets")
      .select("id, name, description, is_active, created_at")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
    supabase
      .from("menu_categories")
      .select("id, name, sort_order, outlet_id")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, name, base_price_minor, is_active, outlet_id, category_id")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
    supabase
      .from("menu_item_modifiers")
      .select("id, menu_item_id, name, price_delta_minor, is_required, max_select, sort_order")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("outlet_menu_item_prices")
      .select("id, outlet_id, menu_item_id, price_minor")
      .eq("property_id", propertyId),
  ]);

  return {
    outlets: outletsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    items: itemsRes.data ?? [],
    modifiers: modifiersRes.data ?? [],
    outletPrices: pricesRes.data ?? [],
  };
}
