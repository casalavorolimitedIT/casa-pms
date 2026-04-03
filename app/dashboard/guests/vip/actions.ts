"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dispatchOutboundMessage } from "@/lib/pms/messaging";

export async function getVipContext(propertyId: string) {
  const supabase = await createClient();

  const [flagsRes, reservationsRes] = await Promise.all([
    supabase
      .from("guest_vip_flags")
      .select(
        "id, guest_id, vip_tier, note, is_active, revoked_at, created_at, guests(id, first_name, last_name, email, phone, nationality)"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, room_id, guest_id, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "tentative", "checked_in"])
      .order("check_in", { ascending: true })
      .limit(50),
  ]);

  // Guest list for tagging (all guests in this property's reservations)
  const guestIds = [
    ...new Set((reservationsRes.data ?? []).map((r) => r.guest_id).filter(Boolean)),
  ];
  const guestsRes =
    guestIds.length > 0
      ? await supabase
          .from("guests")
          .select("id, first_name, last_name, email")
          .in("id", guestIds)
      : { data: [] };

  return {
    flags: flagsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    guests: guestsRes.data ?? [],
  };
}

export async function getGuestBriefData(guestId: string) {
  const supabase = await createClient();
  const [guestRes, prefsRes, reservationsRes, flagRes] = await Promise.all([
    supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, nationality, date_of_birth, notes")
      .eq("id", guestId)
      .maybeSingle(),
    supabase
      .from("guest_preferences")
      .select("key, value")
      .eq("guest_id", guestId)
      .limit(30),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status")
      .eq("guest_id", guestId)
      .order("check_in", { ascending: false })
      .limit(5),
    supabase
      .from("guest_vip_flags")
      .select("vip_tier, note, created_at")
      .eq("guest_id", guestId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return {
    guest: guestRes.data,
    preferences: prefsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    flag: flagRes.data,
  };
}

// ─── Tag as VIP ─────────────────────────────────────────────────────────────

const TagVipSchema = z.object({
  guestId: z.string().uuid(),
  vipTier: z.enum(["Silver", "Gold", "Platinum", "Invitation Only"]),
  note: z.string().max(500).optional(),
});

export async function tagAsVip(formData: FormData) {
  const parsed = TagVipSchema.safeParse({
    guestId: formData.get("guestId"),
    vipTier: formData.get("vipTier"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) throw new Error("Invalid VIP tag data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Deactivate any existing active flag for this guest first
  await supabase
    .from("guest_vip_flags")
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("guest_id", parsed.data.guestId)
    .eq("is_active", true);

  await supabase.from("guest_vip_flags").insert({
    guest_id: parsed.data.guestId,
    vip_tier: parsed.data.vipTier,
    note: parsed.data.note ?? null,
    flagged_by: user.id,
    is_active: true,
  });

  revalidatePath("/dashboard/guests/vip");
}

// ─── Revoke VIP ─────────────────────────────────────────────────────────────

export async function revokeVipFlag(formData: FormData) {
  const flagId = formData.get("flagId");
  if (typeof flagId !== "string" || !flagId) throw new Error("Missing flagId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  await supabase
    .from("guest_vip_flags")
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("id", flagId);

  revalidatePath("/dashboard/guests/vip");
}

// ─── Amenity tasks ──────────────────────────────────────────────────────────

const AmenityTaskSchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  roomId: z.string().uuid().optional().or(z.literal("")).or(z.null()),
  guestName: z.string().max(120).default("VIP Guest"),
  tier: z.string().max(60).default("VIP"),
});

const VIP_AMENITIES = [
  "VIP welcome card and room personalisation",
  "Prepare welcome amenity (fruit basket / flowers)",
  "Pre-inspection of room before VIP arrival",
  "Fresh flowers and preferred pillow setup",
  "Complimentary minibar stocking per tier preference",
];

export async function createAmenityTasks(formData: FormData) {
  const parsed = AmenityTaskSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    roomId: formData.get("roomId") ?? null,
    guestName: formData.get("guestName") ?? "VIP Guest",
    tier: formData.get("tier") ?? "VIP",
  });

  if (!parsed.success) throw new Error("Invalid amenity task data");

  const supabase = await createClient();
  const taskRows = VIP_AMENITIES.map((title) => ({
    property_id: parsed.data.propertyId,
    room_id: parsed.data.roomId || null,
    title: `[${parsed.data.tier}] ${title} — ${parsed.data.guestName}`,
    status: "todo",
  }));

  await supabase.from("tasks").insert(taskRows);
  revalidatePath("/dashboard/guests/vip");
}

// ─── Pre-arrival brief ───────────────────────────────────────────────────────

export async function generateVipBrief(guestId: string) {
  const data = await getGuestBriefData(guestId);
  const { guest, preferences, reservations, flag } = data;

  if (!guest) return "Guest not found.";

  const lines: string[] = [];
  lines.push(`VIP GUEST BRIEF`);
  lines.push(`───────────────────────────────`);
  lines.push(`Name: ${guest.first_name} ${guest.last_name}`);
  if (guest.nationality) lines.push(`Nationality: ${guest.nationality}`);
  if (guest.date_of_birth) lines.push(`Date of birth: ${guest.date_of_birth}`);
  if (flag) lines.push(`VIP Tier: ${flag.vip_tier}${flag.note ? ` — ${flag.note}` : ""}`);
  lines.push("");
  lines.push(`Stay history: ${reservations.length} reservation${reservations.length !== 1 ? "s" : ""}`);
  const upcoming = reservations.find((r) => ["confirmed", "tentative"].includes(r.status));
  if (upcoming) {
    lines.push(`Upcoming stay: ${upcoming.check_in} → ${upcoming.check_out}`);
  }
  if (preferences.length > 0) {
    lines.push("");
    lines.push("Known preferences:");
    for (const pref of preferences) {
      lines.push(`  • ${pref.key}: ${pref.value}`);
    }
  }
  if (guest.notes) {
    lines.push("");
    lines.push(`Notes: ${guest.notes}`);
  }

  return lines.join("\n");
}

// ─── Send VIP arrival notification ─────────────────────────────────────────

const NotifySchema = z.object({
  guestId: z.string().uuid(),
  propertyId: z.string().uuid(),
  message: z.string().max(500),
});

export async function sendVipArrivalNotice(formData: FormData) {
  const parsed = NotifySchema.safeParse({
    guestId: formData.get("guestId"),
    propertyId: formData.get("propertyId"),
    message: formData.get("message"),
  });
  if (!parsed.success) throw new Error("Invalid notification data");

  const supabase = await createClient();
  const { data: guest } = await supabase
    .from("guests")
    .select("first_name, last_name, phone")
    .eq("id", parsed.data.guestId)
    .maybeSingle();

  if (!guest?.phone) return;

  await dispatchOutboundMessage({
    propertyId: parsed.data.propertyId,
    guestPhone: guest.phone,
    body: parsed.data.message,
  });
}
