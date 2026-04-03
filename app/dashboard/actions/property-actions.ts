"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const PropertyCreateSchema = z.object({
  name: z.string().min(2).max(120),
  currencyCode: z.string().min(3).max(3).default("USD"),
  timezone: z.string().min(2).max(80).default("UTC"),
});

const PropertyUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  currencyCode: z.string().min(3).max(3),
  timezone: z.string().min(2).max(80),
});

export interface PropertySwitcherItem {
  id: string;
  name: string;
  currencyCode: string;
  timezone: string;
}

export async function getUserOrganizationId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.organization_id ?? null;
}

export async function createPropertyAction(formData: FormData) {
  const parsed = PropertyCreateSchema.safeParse({
    name: formData.get("name"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid property input" };
  }

  const supabase = await createClient();
  const orgId = await getUserOrganizationId();

  if (!orgId) {
    return { error: "No organization linked to your account." };
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      organization_id: orgId,
      name: parsed.data.name,
      currency_code: parsed.data.currencyCode.toUpperCase(),
      timezone: parsed.data.timezone,
    })
    .select("id, name, currency_code, timezone")
    .single();

  if (error || !property) {
    return { error: error?.message ?? "Failed to create property." };
  }

  await supabase.from("property_settings").upsert(
    {
      property_id: property.id,
      check_in_time: "15:00",
      check_out_time: "11:00",
    },
    { onConflict: "property_id" },
  );

  revalidatePath("/dashboard", "layout");

  return {
    success: true,
    property: {
      id: property.id,
      name: property.name,
      currencyCode: property.currency_code,
      timezone: property.timezone,
    } as PropertySwitcherItem,
  };
}

export async function updatePropertyAction(formData: FormData) {
  const parsed = PropertyUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid property update input" };
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("properties")
    .update({
      name: parsed.data.name,
      currency_code: parsed.data.currencyCode.toUpperCase(),
      timezone: parsed.data.timezone,
    })
    .eq("id", parsed.data.id)
    .select("id, name, currency_code, timezone")
    .single();

  if (error || !updated) {
    return { error: error?.message ?? "Failed to update property." };
  }

  revalidatePath("/dashboard", "layout");

  return {
    success: true,
    property: {
      id: updated.id,
      name: updated.name,
      currencyCode: updated.currency_code,
      timezone: updated.timezone,
    } as PropertySwitcherItem,
  };
}
