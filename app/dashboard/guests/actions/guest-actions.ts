"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const GuestSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  nationality: z.string().max(60).optional(),
  dateOfBirth: z.string().date().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  organizationId: z.string().uuid(),
});

const GuestPreferenceSchema = z.object({
  guestId: z.string().uuid(),
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(500),
});

const VipFlagSchema = z.object({
  guestId: z.string().uuid(),
  vipTier: z.enum(["bronze", "silver", "gold", "platinum", "vip"]),
  note: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Guest CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createGuest(formData: FormData) {
  const supabase = await createClient();

  const parsed = GuestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    nationality: formData.get("nationality"),
    dateOfBirth: formData.get("dateOfBirth"),
    notes: formData.get("notes"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const { data, error } = await supabase
    .from("guests")
    .insert({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      nationality: parsed.data.nationality || null,
      date_of_birth: parsed.data.dateOfBirth || null,
      notes: parsed.data.notes || null,
      organization_id: parsed.data.organizationId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/guests");
  return { id: data.id };
}

export async function updateGuest(id: string, formData: FormData) {
  const supabase = await createClient();

  const parsed = GuestSchema.omit({ organizationId: true }).safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    nationality: formData.get("nationality"),
    dateOfBirth: formData.get("dateOfBirth"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const { error } = await supabase
    .from("guests")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      nationality: parsed.data.nationality || null,
      date_of_birth: parsed.data.dateOfBirth || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/guests/${id}`);
  return { success: true };
}

export async function searchGuests(
  organizationId: string,
  query: string,
): Promise<{ guests: GuestRow[]; error?: string }> {
  const supabase = await createClient();

  const trimmed = query.trim();

  const request = trimmed
    ? supabase
        .from("guests")
        .select(
          "id, first_name, last_name, email, phone, nationality, created_at",
        )
        .eq("organization_id", organizationId)
        .or(
          `first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`,
        )
        .order("last_name")
        .limit(50)
    : supabase
        .from("guests")
        .select(
          "id, first_name, last_name, email, phone, nationality, created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);

  const { data, error } = await request;
  if (error) return { error: error.message, guests: [] };
  return { guests: (data ?? []) as GuestRow[] };
}

export async function getGuest(id: string) {
  const supabase = await createClient();

  const [guestRes, prefsRes, vipRes] = await Promise.all([
    supabase
      .from("guests")
      .select(
        "id, first_name, last_name, email, phone, nationality, date_of_birth, notes, created_at",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("guest_preferences")
      .select("id, key, value")
      .eq("guest_id", id)
      .order("key"),
    supabase
      .from("guest_vip_flags")
      .select("id, vip_tier, note, created_at")
      .eq("guest_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (guestRes.error) return { error: guestRes.error.message };

  return {
    guest: guestRes.data,
    preferences: prefsRes.data ?? [],
    vipFlag: vipRes.data ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertGuestPreference(formData: FormData) {
  const supabase = await createClient();

  const parsed = GuestPreferenceSchema.safeParse({
    guestId: formData.get("guestId"),
    key: formData.get("key"),
    value: formData.get("value"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const { error } = await supabase.from("guest_preferences").upsert(
    {
      guest_id: parsed.data.guestId,
      key: parsed.data.key,
      value: parsed.data.value,
    },
    { onConflict: "guest_id,key" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/guests/${parsed.data.guestId}`);
  return { success: true };
}

export async function deleteGuestPreference(id: string, guestId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("guest_preferences")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/guests/${guestId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// VIP flags
// ─────────────────────────────────────────────────────────────────────────────

export async function flagGuestVip(formData: FormData) {
  const supabase = await createClient();

  const parsed = VipFlagSchema.safeParse({
    guestId: formData.get("guestId"),
    vipTier: formData.get("vipTier"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("guest_vip_flags").insert({
    guest_id: parsed.data.guestId,
    vip_tier: parsed.data.vipTier,
    note: parsed.data.note ?? null,
    flagged_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/guests/${parsed.data.guestId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface GuestRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  created_at: string;
}
