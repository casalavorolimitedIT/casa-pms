"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchOutboundMessage } from "@/lib/pms/messaging";

function buildAppUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
  return `${base}${path}`;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getFeedbackContext(propertyId: string) {
  const supabase = await createClient();

  const reservationIds = await supabase
    .from("reservations")
    .select("id")
    .eq("property_id", propertyId)
    .then((res) => (res.data ?? []).map((row) => row.id));

  const [tokensRes, entriesRes, reservationsRes] = await Promise.all([
    supabase
      .from("feedback_tokens")
      .select(
        "id, reservation_id, token, sent_at, responded_at, expires_at, created_at, reservations(id, check_in, check_out, guests(first_name,last_name))"
      )
      .in("reservation_id", reservationIds)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("feedback_entries")
      .select(
        "id, reservation_id, overall_score, cleanliness_score, service_score, food_score, comment, status, escalation_reason, escalation_note, resolved_at, created_at, reservations(check_in, guests(first_name,last_name))"
      )
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_out", "checked_in", "tentative"])
      .order("check_out", { ascending: false })
      .limit(50),
  ]);

  return {
    tokens: tokensRes.data ?? [],
    entries: entriesRes.data ?? [],
    reservations: reservationsRes.data ?? [],
  };
}

// ─── Send survey ─────────────────────────────────────────────────────────────

const SendFeedbackSchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(14),
});

export async function sendFeedbackSurvey(formData: FormData) {
  const parsed = SendFeedbackSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    expiresInDays: formData.get("expiresInDays") ?? 14,
  });

  if (!parsed.success) throw new Error("Invalid feedback survey data");

  const supabase = await createClient();

  // Ensure the selected reservation belongs to the selected property.
  // This avoids opaque RLS insert failures and gives a clear operator error.
  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", parsed.data.reservationId)
    .eq("property_id", parsed.data.propertyId)
    .maybeSingle();

  if (reservationError) {
    throw new Error(`Failed to validate reservation: ${reservationError.message}`);
  }

  if (!reservation) {
    throw new Error("Selected reservation does not belong to this property");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

  const { data: tokenRecord, error: tokenError } = await supabase
    .from("feedback_tokens")
    .insert({
      reservation_id: parsed.data.reservationId,
      sent_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (tokenError) {
    throw new Error(`Failed to create feedback token: ${tokenError.message}`);
  }

  if (!tokenRecord) throw new Error("Failed to create feedback token");

  const surveyUrl = buildAppUrl(`/feedback/${tokenRecord.token}`);

  // Send via SMS if guest has phone
  const { data: res } = await supabase
    .from("reservations")
    .select("guests(first_name, phone)")
    .eq("id", parsed.data.reservationId)
    .maybeSingle();

  const guest = Array.isArray((res as { guests?: unknown } | null)?.guests)
    ? ((res as { guests?: unknown[] | null }).guests ?? [])[0] as { first_name?: string; phone?: string } | undefined
    : ((res as { guests?: unknown } | null)?.guests as { first_name?: string; phone?: string } | null);

  if (guest?.phone) {
    await dispatchOutboundMessage({
      channel: "sms",
      to: guest.phone,
      body: `Hi ${guest.first_name ?? "there"}, we hope you enjoyed your stay! Share your feedback here: ${surveyUrl}`,
    }).catch(() => {
      // Messaging failure is non-fatal
    });
  }

  revalidatePath("/dashboard/feedback");
  return { surveyUrl };
}

// ─── Escalate ─────────────────────────────────────────────────────────────────

const EscalateSchema = z.object({
  entryId: z.string().uuid(),
  reason: z.string().max(200),
  note: z.string().max(1000).optional(),
});

export async function escalateFeedback(formData: FormData) {
  const parsed = EscalateSchema.safeParse({
    entryId: formData.get("entryId"),
    reason: formData.get("reason"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) throw new Error("Invalid escalation data");

  const supabase = await createClient();
  await supabase
    .from("feedback_entries")
    .update({
      status: "escalated",
      escalation_reason: parsed.data.reason,
      escalation_note: parsed.data.note ?? null,
    })
    .eq("id", parsed.data.entryId);

  revalidatePath("/dashboard/feedback");
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

const ResolveSchema = z.object({
  entryId: z.string().uuid(),
  resolutionNote: z.string().max(1000).optional(),
});

export async function resolveFeedbackIssue(formData: FormData) {
  const parsed = ResolveSchema.safeParse({
    entryId: formData.get("entryId"),
    resolutionNote: formData.get("resolutionNote") ?? "",
  });

  if (!parsed.success) throw new Error("Invalid resolution data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("feedback_entries")
    .update({
      status: "resolved",
      escalation_note: parsed.data.resolutionNote
        ? parsed.data.resolutionNote
        : undefined,
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id ?? null,
    })
    .eq("id", parsed.data.entryId);

  revalidatePath("/dashboard/feedback");
}

// ─── Guest submission (public, uses admin client) ────────────────────────────

const SubmitFeedbackSchema = z.object({
  token: z.string().trim().min(48).max(48),
  overallScore: z.coerce.number().int().min(1).max(5),
  cleanlinessScore: z.coerce.number().int().min(1).max(5).optional(),
  serviceScore: z.coerce.number().int().min(1).max(5).optional(),
  foodScore: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional().or(z.literal("")),
});

export async function submitGuestFeedback(formData: FormData) {
  const parsed = SubmitFeedbackSchema.safeParse({
    token: formData.get("token"),
    overallScore: formData.get("overallScore"),
    cleanlinessScore: formData.get("cleanlinessScore") ?? undefined,
    serviceScore: formData.get("serviceScore") ?? undefined,
    foodScore: formData.get("foodScore") ?? undefined,
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) throw new Error("Invalid feedback submission");

  const admin = createAdminClient();

  const { data: tokenRecord } = await admin
    .from("feedback_tokens")
    .select("id, reservation_id, responded_at, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!tokenRecord) throw new Error("Invalid token");
  if (tokenRecord.responded_at) throw new Error("Already submitted");
  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    throw new Error("Token expired");
  }

  // Get property_id from the reservation
  const { data: res } = await admin
    .from("reservations")
    .select("property_id")
    .eq("id", tokenRecord.reservation_id)
    .maybeSingle();

  if (!res?.property_id) throw new Error("Reservation not found");

  const autoEscalate = parsed.data.overallScore <= 2;

  await admin.from("feedback_entries").insert({
    token_id: tokenRecord.id,
    reservation_id: tokenRecord.reservation_id,
    property_id: res.property_id,
    overall_score: parsed.data.overallScore,
    cleanliness_score: parsed.data.cleanlinessScore ?? null,
    service_score: parsed.data.serviceScore ?? null,
    food_score: parsed.data.foodScore ?? null,
    comment: parsed.data.comment || null,
    status: autoEscalate ? "escalated" : "received",
    escalation_reason: autoEscalate ? "Auto-escalated: low overall score" : null,
  });

  await admin
    .from("feedback_tokens")
    .update({ responded_at: new Date().toISOString() })
    .eq("id", tokenRecord.id);
}
