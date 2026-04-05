"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchOutboundMessage, sanitizeMessagePreview } from "@/lib/pms/messaging";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";

const SendSurveySchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

const RecordResponseSchema = z.object({
  token: z.string().trim().min(48).max(48),
  arrivalTime: z.string().trim().max(20).optional().or(z.literal("")),
  transportType: z.enum(["own_car", "taxi", "airport_transfer", "train", "other"]).optional().or(z.literal("")),
  pillowPreference: z.string().max(100).optional().or(z.literal("")),
  floorPreference: z.string().max(100).optional().or(z.literal("")),
  dietaryRequirements: z.string().max(500).optional().or(z.literal("")),
  specialRequests: z.string().max(1000).optional().or(z.literal("")),
});

function buildAppUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
  return `${base}${path}`;
}

export async function getPreArrivalContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [reservationsRes, tokensRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(id, first_name, last_name, email, phone)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "tentative"])
      .order("check_in", { ascending: true })
      .limit(50),
    supabase
      .from("pre_arrival_tokens")
      .select("id, reservation_id, token, sent_at, responded_at, expires_at, created_at, reservations(id, check_in, guests(first_name,last_name))")
      .in(
        "reservation_id",
        (await supabase
          .from("reservations")
          .select("id")
          .eq("property_id", propertyId)
          .then((res) => (res.data ?? []).map((reservation) => reservation.id))
        ),
      )
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  return {
    reservations: reservationsRes.data ?? [],
    tokens: tokensRes.data ?? [],
  };
}

export async function getPreArrivalResponses(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const reservationIds = await supabase
    .from("reservations")
    .select("id")
    .eq("property_id", propertyId)
    .then((res) => (res.data ?? []).map((row) => row.id));

  const { data } = await supabase
    .from("pre_arrival_responses")
    .select("id, reservation_id, arrival_time, transport_type, room_preferences, special_requests, created_at, reservations(check_in, guests(first_name,last_name))")
    .in("reservation_id", reservationIds)
    .order("created_at", { ascending: false })
    .limit(40);

  return data ?? [];
}

export async function sendPreArrivalSurvey(formData: FormData) {
  const parsed = SendSurveySchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    expiresInDays: formData.get("expiresInDays"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, property_id, check_in, guests(first_name, last_name, email, phone)")
    .eq("id", parsed.data.reservationId)
    .eq("property_id", parsed.data.propertyId)
    .single();

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  const guestRaw = reservation.guests;
  const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

  const { data: token } = await supabase
    .from("pre_arrival_tokens")
    .insert({
      reservation_id: parsed.data.reservationId,
      expires_at: expiresAt.toISOString(),
      sent_at: new Date().toISOString(),
    })
    .select("id, token")
    .single();

  if (!token) {
    throw new Error("Unable to create token");
  }

  const surveyUrl = buildAppUrl(`/pre-arrival/${token.token}`);
  const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
  const phone = (guest as { phone?: string } | null)?.phone?.trim() ?? "";

  if (phone) {
    const body = `Hello ${guestName}, please take 2 minutes to submit your pre-arrival preferences so your room is ready when you land: ${surveyUrl}`;
    await dispatchOutboundMessage({ channel: "sms", to: phone, body });
  }

  revalidatePath("/dashboard/pre-arrival");
  return { surveyUrl };
}

export async function recordPreArrivalResponse(formData: FormData) {
  const parsed = RecordResponseSchema.safeParse({
    token: formData.get("token"),
    arrivalTime: formData.get("arrivalTime"),
    transportType: formData.get("transportType"),
    pillowPreference: formData.get("pillowPreference"),
    floorPreference: formData.get("floorPreference"),
    dietaryRequirements: formData.get("dietaryRequirements"),
    specialRequests: formData.get("specialRequests"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const admin = createAdminClient();

  const { data: tokenRecord } = await admin
    .from("pre_arrival_tokens")
    .select("id, reservation_id, responded_at, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!tokenRecord) {
    throw new Error("This link is not valid. Please contact the hotel.");
  }

  if (tokenRecord.responded_at) {
    throw new Error("This pre-arrival form has already been submitted.");
  }

  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    throw new Error("This link has expired. Please contact the hotel for a new one.");
  }

  const roomPreferences: Record<string, string> = {};
  if (parsed.data.pillowPreference) roomPreferences.pillow = parsed.data.pillowPreference;
  if (parsed.data.floorPreference) roomPreferences.floor = parsed.data.floorPreference;
  if (parsed.data.dietaryRequirements) roomPreferences.dietary = parsed.data.dietaryRequirements;

  await admin.from("pre_arrival_responses").insert({
    token_id: tokenRecord.id,
    reservation_id: tokenRecord.reservation_id,
    arrival_time: parsed.data.arrivalTime || null,
    transport_type: parsed.data.transportType || null,
    room_preferences: roomPreferences,
    special_requests: parsed.data.specialRequests || null,
  });

  if (parsed.data.specialRequests?.trim()) {
    const { data: reservation } = await admin
      .from("reservations")
      .select("property_id")
      .eq("id", tokenRecord.reservation_id)
      .maybeSingle();

    if (reservation?.property_id) {
      await admin.from("tasks").insert({
        property_id: reservation.property_id,
        title: `Pre-arrival: ${sanitizeMessagePreview(parsed.data.specialRequests)}`,
        status: "todo",
      });
    }
  }

  await admin
    .from("pre_arrival_tokens")
    .update({ responded_at: new Date().toISOString() })
    .eq("id", tokenRecord.id);
}
