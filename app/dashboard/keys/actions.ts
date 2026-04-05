"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

async function ensureKeyInActiveProperty(keyId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("digital_keys")
    .select("id")
    .eq("id", keyId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Digital key not found for the active property");
  }
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getKeyContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [keysRes, reservationsRes, roomsRes] = await Promise.all([
    supabase
      .from("digital_keys")
      .select(
        "id, reservation_id, room_id, provider, provider_key_id, status, issued_at, valid_from, valid_until, revoked_at, audit_log, created_at, reservations(id, check_in, check_out, guests(first_name,last_name)), rooms(number,floor)"
      )
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, room_id, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("check_in", { ascending: true })
      .limit(50),
    supabase
      .from("rooms")
      .select("id, number, floor")
      .eq("property_id", propertyId)
      .order("floor", { ascending: true }),
  ]);

  return {
    keys: keysRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    rooms: roomsRes.data ?? [],
  };
}

// ─── Issue key ──────────────────────────────────────────────────────────────

const IssueKeySchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  roomId: z.string().uuid(),
  provider: z.enum(["manual", "kaba", "assa", "salto", "dormakaba"]),
  providerKeyId: z.string().max(200).optional().or(z.literal("")),
  validFrom: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  validUntil: z.string().datetime({ offset: true }).optional().or(z.literal("")),
});

export async function issueDigitalKey(formData: FormData) {
  const parsed = IssueKeySchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    roomId: formData.get("roomId"),
    provider: formData.get("provider"),
    providerKeyId: formData.get("providerKeyId") ?? "",
    validFrom: formData.get("validFrom") ?? "",
    validUntil: formData.get("validUntil") ?? "",
  });

  if (!parsed.success) throw new Error("Invalid key issue data");

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const auditEntry = {
    event: "issued",
    by: user.id,
    at: new Date().toISOString(),
    provider: parsed.data.provider,
    provider_key_id: parsed.data.providerKeyId || null,
  };

  await supabase.from("digital_keys").insert({
    property_id: parsed.data.propertyId,
    reservation_id: parsed.data.reservationId,
    room_id: parsed.data.roomId,
    provider: parsed.data.provider,
    provider_key_id: parsed.data.providerKeyId || null,
    status: "active",
    issued_at: new Date().toISOString(),
    issued_by: user.id,
    valid_from: parsed.data.validFrom || null,
    valid_until: parsed.data.validUntil || null,
    audit_log: JSON.stringify([auditEntry]),
  });

  revalidatePath("/dashboard/keys");
}

// ─── Revoke key ──────────────────────────────────────────────────────────────

const RevokeKeySchema = z.object({
  keyId: z.string().uuid(),
  reason: z.string().max(300).optional().or(z.literal("")),
});

export async function revokeKey(formData: FormData) {
  const parsed = RevokeKeySchema.safeParse({
    keyId: formData.get("keyId"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) throw new Error("Invalid revoke data");

  await ensureKeyInActiveProperty(parsed.data.keyId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch current audit_log
  const { data: existing } = await supabase
    .from("digital_keys")
    .select("audit_log")
    .eq("id", parsed.data.keyId)
    .maybeSingle();

  const currentLog: unknown[] = Array.isArray(existing?.audit_log) ? existing.audit_log : [];
  const revokeEntry = {
    event: "revoked",
    by: user.id,
    at: new Date().toISOString(),
    reason: parsed.data.reason || null,
  };

  await supabase
    .from("digital_keys")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      audit_log: JSON.stringify([...currentLog, revokeEntry]),
    })
    .eq("id", parsed.data.keyId);

  revalidatePath("/dashboard/keys");
}

// ─── Get single key status ───────────────────────────────────────────────────

export async function getKeyStatus(keyId: string) {
  await ensureKeyInActiveProperty(keyId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("digital_keys")
    .select(
      "id, provider, provider_key_id, status, issued_at, valid_from, valid_until, revoked_at, audit_log, reservations(check_in, check_out, guests(first_name,last_name)), rooms(number,floor)"
    )
    .eq("id", keyId)
    .maybeSingle();

  return data;
}
