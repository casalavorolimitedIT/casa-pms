"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";

const CreateAssetSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2).max(140),
  category: z.string().max(80).optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  warrantyUntil: z.string().optional().or(z.literal("")),
});

const UpdateAssetSchema = z.object({
  assetId: z.string().uuid(),
  propertyId: z.string().uuid(),
  name: z.string().min(2).max(140),
  category: z.string().max(80).optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  warrantyUntil: z.string().optional().or(z.literal("")),
});

const LogServiceEventSchema = z.object({
  assetId: z.string().uuid(),
  propertyId: z.string().uuid(),
  serviceType: z.string().min(2).max(80),
  serviceDate: z.string().optional().or(z.literal("")),
  vendor: z.string().max(160).optional().or(z.literal("")),
  costMinor: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  workOrderId: z.string().uuid().optional().or(z.literal("")),
});

export async function createAsset(formData: FormData) {
  const parsed = CreateAssetSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    category: formData.get("category"),
    purchaseDate: formData.get("purchaseDate"),
    warrantyUntil: formData.get("warrantyUntil"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid asset input" };
  }

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("assets")
    .insert({
      property_id: parsed.data.propertyId,
      name: parsed.data.name,
      category: parsed.data.category || null,
      purchase_date: parsed.data.purchaseDate || null,
      warranty_until: parsed.data.warrantyUntil || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Unable to create asset" };
  }

  revalidatePath("/dashboard/assets");
  return { success: true, assetId: data.id };
}

export async function logServiceEvent(formData: FormData) {
  const rawCost = formData.get("costMinor");
  const parsed = LogServiceEventSchema.safeParse({
    assetId: formData.get("assetId"),
    propertyId: formData.get("propertyId"),
    serviceType: formData.get("serviceType"),
    serviceDate: formData.get("serviceDate"),
    vendor: formData.get("vendor"),
    costMinor:
      rawCost === null || rawCost === ""
        ? undefined
        : rawCost,
    notes: formData.get("notes"),
    workOrderId: formData.get("workOrderId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid service event" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ensure the asset belongs to the property in this write request.
  const { data: asset } = await supabase
    .from("assets")
    .select("id")
    .eq("id", parsed.data.assetId)
    .eq("property_id", parsed.data.propertyId)
    .maybeSingle();

  if (!asset) {
    return { error: "Asset not found for this property" };
  }

  const { error } = await supabase.from("asset_service_events").insert({
    asset_id: parsed.data.assetId,
    property_id: parsed.data.propertyId,
    work_order_id: parsed.data.workOrderId || null,
    service_type: parsed.data.serviceType,
    vendor: parsed.data.vendor || null,
    cost_minor: parsed.data.costMinor ?? null,
    notes: parsed.data.notes || null,
    serviced_at: parsed.data.serviceDate || new Date().toISOString(),
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/assets/${parsed.data.assetId}`);
  revalidatePath("/dashboard/assets");
  return { success: true };
}

export async function updateAsset(formData: FormData) {
  const parsed = UpdateAssetSchema.safeParse({
    assetId: formData.get("assetId"),
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    category: formData.get("category"),
    purchaseDate: formData.get("purchaseDate"),
    warrantyUntil: formData.get("warrantyUntil"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid asset update" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({
      name: parsed.data.name,
      category: parsed.data.category || null,
      purchase_date: parsed.data.purchaseDate || null,
      warranty_until: parsed.data.warrantyUntil || null,
    })
    .eq("id", parsed.data.assetId)
    .eq("property_id", parsed.data.propertyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/assets");
  revalidatePath(`/dashboard/assets/${parsed.data.assetId}`);
  return { success: true };
}
