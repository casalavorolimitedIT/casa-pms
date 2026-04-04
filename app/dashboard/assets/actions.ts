"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
