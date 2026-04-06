"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess } from "@/lib/pms/property-context";
import { requirePermission } from "@/lib/staff/server-permissions";

const CreateSpaBookingSchema = z.object({
  propertyId: z.string().uuid(),
  serviceId: z.string().uuid(),
  therapistId: z.string().uuid(),
  roomId: z.string().uuid(),
  startsAt: z.string().min(8),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  guestId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const AssignTherapistSchema = z.object({
  bookingId: z.string().uuid(),
  therapistId: z.string().uuid(),
});

const ShiftSchema = z.object({
  propertyId: z.string().uuid(),
  therapistId: z.string().uuid(),
  startsAt: z.string().min(8),
  endsAt: z.string().min(8),
  status: z.enum(["available", "off", "blocked"]).default("available"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const CreateTherapistSchema = z.object({
  propertyId: z.string().uuid(),
  displayName: z.string().min(2).max(120),
});

const AddQualificationSchema = z.object({
  propertyId: z.string().uuid(),
  therapistId: z.string().uuid(),
  serviceId: z.string().uuid(),
});

const BookingIdSchema = z.object({
  bookingId: z.string().uuid(),
});

const PostSpaChargeSchema = z.object({
  bookingId: z.string().uuid(),
  reservationId: z.string().uuid().optional().or(z.literal("")),
});

const SettleSpaSeparatelySchema = z.object({
  bookingId: z.string().uuid(),
  amountMinor: z.coerce.number().int().min(0),
  method: z.string().min(2).max(40),
  reference: z.string().max(120).optional().or(z.literal("")),
});

const CreateSpaServiceSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceMinor: z.coerce.number().int().min(0),
  description: z.string().max(500).optional().or(z.literal("")),
});

const UpdateSpaServiceSchema = CreateSpaServiceSchema.extend({
  serviceId: z.string().uuid(),
  isActive: z.coerce.boolean().default(true),
});

const CreateSpaTreatmentRoomSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2).max(120),
});

const UpdateSpaTreatmentRoomSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid(),
  name: z.string().min(2).max(120),
  isActive: z.coerce.boolean().default(true),
});

const SellMembershipSchema = z.object({
  propertyId: z.string().uuid(),
  guestId: z.string().uuid(),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  planName: z.string().min(2).max(120),
  validFrom: z.string().min(4),
  validUntil: z.string().min(4),
  allowance: z.coerce.number().int().min(0),
  soldAmountMinor: z.coerce.number().int().min(0),
});

const UseAllowanceSchema = z.object({
  membershipId: z.string().uuid(),
  bookingId: z.string().uuid().optional().or(z.literal("")),
  unitsUsed: z.coerce.number().int().positive().max(100),
  note: z.string().max(500).optional().or(z.literal("")),
});

const RenewMembershipSchema = z.object({
  membershipId: z.string().uuid(),
  nextValidUntil: z.string().min(4),
  addAllowance: z.coerce.number().int().min(0).default(0),
});

async function resolveFolioIdForReservation(reservationId: string) {
  const supabase = await createClient();

  let { data: folio } = await supabase
    .from("folios")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("status", "open")
    .maybeSingle();

  if (!folio) {
    const { data: created, error: folioError } = await supabase
      .from("folios")
      .insert({
        reservation_id: reservationId,
        status: "open",
        currency_code: "USD",
      })
      .select("id")
      .single();

    if (folioError || !created) {
      return { success: false as const, error: folioError?.message ?? "Unable to create folio" };
    }

    folio = created;
  }

  return { success: true as const, folioId: folio.id };
}

async function getGuestsForPropertyScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
) {
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError || !property?.organization_id) {
    return [];
  }

  const { data: guests } = await supabase
    .from("guests")
    .select("id, first_name, last_name")
    .eq("organization_id", property.organization_id)
    .order("first_name", { ascending: true })
    .limit(400);

  return guests ?? [];
}

async function ensureTherapistQualified(propertyId: string, therapistId: string, serviceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spa_therapist_qualifications")
    .select("id")
    .eq("property_id", propertyId)
    .eq("therapist_id", therapistId)
    .eq("service_id", serviceId)
    .maybeSingle();

  return Boolean(data?.id);
}

async function hasTherapistShiftCoverage(propertyId: string, therapistId: string, startsAt: string, endsAt: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spa_therapist_shifts")
    .select("id")
    .eq("property_id", propertyId)
    .eq("therapist_id", therapistId)
    .eq("status", "available")
    .lte("starts_at", startsAt)
    .gte("ends_at", endsAt)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

async function hasBookingOverlap(propertyId: string, therapistId: string, roomId: string, startsAt: string, endsAt: string) {
  const supabase = await createClient();

  const [{ count: therapistOverlap }, { count: roomOverlap }] = await Promise.all([
    supabase
      .from("spa_bookings")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("therapist_id", therapistId)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt),
    supabase
      .from("spa_bookings")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("room_id", roomId)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt),
  ]);

  return {
    therapistBusy: (therapistOverlap ?? 0) > 0,
    roomBusy: (roomOverlap ?? 0) > 0,
  };
}

export async function createSpaBooking(formData: FormData) {
  const parsed = CreateSpaBookingSchema.safeParse({
    propertyId: formData.get("propertyId"),
    serviceId: formData.get("serviceId"),
    therapistId: formData.get("therapistId"),
    roomId: formData.get("roomId"),
    startsAt: formData.get("startsAt"),
    reservationId: formData.get("reservationId"),
    guestId: formData.get("guestId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid spa booking input" };
  }

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("spa.manage", parsed.data.propertyId);

  const supabase = await createClient();

  const { data: service, error: serviceErr } = await supabase
    .from("spa_services")
    .select("id, duration_minutes, price_minor")
    .eq("id", parsed.data.serviceId)
    .eq("property_id", parsed.data.propertyId)
    .maybeSingle();

  if (serviceErr) return { error: serviceErr.message };
  if (!service) return { error: "Spa service not found" };

  const startsAtDate = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) return { error: "Invalid booking start time" };
  const endsAtDate = new Date(startsAtDate.getTime() + service.duration_minutes * 60_000);

  const startsAtIso = startsAtDate.toISOString();
  const endsAtIso = endsAtDate.toISOString();

  const qualified = await ensureTherapistQualified(parsed.data.propertyId, parsed.data.therapistId, parsed.data.serviceId);
  if (!qualified) return { error: "Therapist is not qualified for selected service" };

  const covered = await hasTherapistShiftCoverage(parsed.data.propertyId, parsed.data.therapistId, startsAtIso, endsAtIso);
  if (!covered) return { error: "Therapist shift does not cover selected time" };

  const overlap = await hasBookingOverlap(parsed.data.propertyId, parsed.data.therapistId, parsed.data.roomId, startsAtIso, endsAtIso);
  if (overlap.therapistBusy) return { error: "Therapist already has a booking in that time slot" };
  if (overlap.roomBusy) return { error: "Treatment room is already occupied for that time slot" };

  const { error } = await supabase.from("spa_bookings").insert({
    property_id: parsed.data.propertyId,
    reservation_id: parsed.data.reservationId || null,
    guest_id: parsed.data.guestId || null,
    service_id: parsed.data.serviceId,
    therapist_id: parsed.data.therapistId,
    room_id: parsed.data.roomId,
    starts_at: startsAtIso,
    ends_at: endsAtIso,
    status: "confirmed",
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

export async function assignTherapist(formData: FormData) {
  const parsed = AssignTherapistSchema.safeParse({
    bookingId: formData.get("bookingId"),
    therapistId: formData.get("therapistId"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid assignment input" };

  const supabase = await createClient();
  const { data: booking, error: bookingErr } = await supabase
    .from("spa_bookings")
    .select("id, property_id, service_id, room_id, starts_at, ends_at")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (bookingErr) return { error: bookingErr.message };
  if (!booking) return { error: "Spa booking not found" };

  await assertActivePropertyAccess(booking.property_id);
  await requirePermission("spa.manage", booking.property_id);

  const qualified = await ensureTherapistQualified(booking.property_id, parsed.data.therapistId, booking.service_id);
  if (!qualified) return { error: "Therapist is not qualified for selected service" };

  const covered = await hasTherapistShiftCoverage(booking.property_id, parsed.data.therapistId, booking.starts_at, booking.ends_at);
  if (!covered) return { error: "Therapist shift does not cover booking time" };

  const { count } = await supabase
    .from("spa_bookings")
    .select("id", { count: "exact", head: true })
    .eq("property_id", booking.property_id)
    .eq("therapist_id", parsed.data.therapistId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", booking.ends_at)
    .gt("ends_at", booking.starts_at)
    .neq("id", booking.id);

  if ((count ?? 0) > 0) return { error: "Therapist has overlapping booking" };

  const { error } = await supabase
    .from("spa_bookings")
    .update({ therapist_id: parsed.data.therapistId })
    .eq("id", parsed.data.bookingId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

export async function updateTherapistSchedule(formData: FormData) {
  const parsed = ShiftSchema.safeParse({
    propertyId: formData.get("propertyId"),
    therapistId: formData.get("therapistId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid therapist schedule input" };

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("spa.manage", parsed.data.propertyId);

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "Shift end must be later than shift start" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("spa_therapist_shifts").insert({
    property_id: parsed.data.propertyId,
    therapist_id: parsed.data.therapistId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/therapists");
  return { success: true };
}

export async function createSpaTherapist(formData: FormData) {
  const parsed = CreateTherapistSchema.safeParse({
    propertyId: formData.get("propertyId"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid therapist input" };

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("spa.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const { error } = await supabase.from("spa_therapists").insert({
    property_id: parsed.data.propertyId,
    display_name: parsed.data.displayName,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/therapists");
  return { success: true };
}

export async function addTherapistQualification(formData: FormData) {
  const parsed = AddQualificationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    therapistId: formData.get("therapistId"),
    serviceId: formData.get("serviceId"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid qualification input" };

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("spa.manage", parsed.data.propertyId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("spa_therapist_qualifications")
    .upsert(
      {
        property_id: parsed.data.propertyId,
        therapist_id: parsed.data.therapistId,
        service_id: parsed.data.serviceId,
      },
      { onConflict: "therapist_id,service_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/therapists");
  return { success: true };
}

export async function postSpaCharge(formData: FormData) {
  const parsed = PostSpaChargeSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reservationId: formData.get("reservationId"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid spa folio post input" };

  const supabase = await createClient();
  const { data: booking, error: bookingErr } = await supabase
    .from("spa_bookings")
    .select("id, property_id, reservation_id, service_id, posted_charge_id, spa_services(price_minor, name)")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (bookingErr) return { error: bookingErr.message };
  if (!booking) return { error: "Spa booking not found" };

  await assertActivePropertyAccess(booking.property_id);
  await requirePermission("folios.post_charge", booking.property_id);

  if (booking.posted_charge_id) return { success: true, chargeId: booking.posted_charge_id };

  const reservationId = parsed.data.reservationId || booking.reservation_id || "";
  if (!reservationId) return { error: "Reservation is required to post to hotel folio" };

  const resolvedFolio = await resolveFolioIdForReservation(reservationId);
  if (!resolvedFolio.success) return { error: resolvedFolio.error };

  const serviceRaw = booking.spa_services as { price_minor?: number; name?: string } | Array<{ price_minor?: number; name?: string }> | null;
  const service = Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw;
  const amountMinor = Number(service?.price_minor ?? 0);

  const { data: charge, error: chargeErr } = await supabase
    .from("folio_charges")
    .insert({
      folio_id: resolvedFolio.folioId,
      amount_minor: amountMinor,
      category: "spa",
      description: `Spa service: ${service?.name ?? booking.service_id}`,
    })
    .select("id")
    .single();

  if (chargeErr || !charge) return { error: chargeErr?.message ?? "Unable to create spa folio charge" };

  await supabase
    .from("spa_bookings")
    .update({ posted_charge_id: charge.id, status: "settled" })
    .eq("id", booking.id);

  revalidatePath("/dashboard/spa/bookings");
  revalidatePath(`/dashboard/folios/${resolvedFolio.folioId}`);
  return { success: true, chargeId: charge.id };
}

export async function settleSpaSeparately(formData: FormData) {
  const parsed = SettleSpaSeparatelySchema.safeParse({
    bookingId: formData.get("bookingId"),
    amountMinor: formData.get("amountMinor"),
    method: formData.get("method"),
    reference: formData.get("reference"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid standalone settlement input" };

  const supabase = await createClient();
  const { data: booking, error: bookingErr } = await supabase
    .from("spa_bookings")
    .select("id, property_id")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (bookingErr) return { error: bookingErr.message };
  if (!booking) return { error: "Spa booking not found" };

  await assertActivePropertyAccess(booking.property_id);
  await requirePermission("spa.manage", booking.property_id);

  const { error } = await supabase.from("spa_settlements").upsert(
    {
      property_id: booking.property_id,
      booking_id: booking.id,
      amount_minor: parsed.data.amountMinor,
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      status: "paid",
    },
    { onConflict: "booking_id" },
  );

  if (error) return { error: error.message };

  await supabase.from("spa_bookings").update({ status: "settled" }).eq("id", booking.id);

  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

export async function transferSpaToHotelFolio(formData: FormData) {
  const parsed = BookingIdSchema.safeParse({ bookingId: formData.get("bookingId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid transfer input" };

  const posted = await postSpaCharge(formData);
  if (posted && "error" in posted) return posted;

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("spa_bookings")
    .select("id, property_id")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (booking) {
    await supabase
      .from("spa_settlements")
      .update({ status: "transferred_to_hotel_folio" })
      .eq("property_id", booking.property_id)
      .eq("booking_id", booking.id);
  }

  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

export async function sellMembership(formData: FormData) {
  const parsed = SellMembershipSchema.safeParse({
    propertyId: formData.get("propertyId"),
    guestId: formData.get("guestId"),
    reservationId: formData.get("reservationId"),
    planName: formData.get("planName"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil"),
    allowance: formData.get("allowance"),
    soldAmountMinor: formData.get("soldAmountMinor"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid membership input" };

  await assertActivePropertyAccess(parsed.data.propertyId);
  await requirePermission("spa.manage", parsed.data.propertyId);

  const supabase = await createClient();

  let folioChargeId: string | null = null;
  if (parsed.data.reservationId && parsed.data.soldAmountMinor > 0) {
    const resolved = await resolveFolioIdForReservation(parsed.data.reservationId);
    if ("error" in resolved) return resolved;

    const { data: charge, error: chargeErr } = await supabase
      .from("folio_charges")
      .insert({
        folio_id: resolved.folioId,
        amount_minor: parsed.data.soldAmountMinor,
        category: "spa_membership",
        description: `Spa membership: ${parsed.data.planName}`,
      })
      .select("id")
      .single();

    if (chargeErr || !charge) return { error: chargeErr?.message ?? "Unable to post membership charge" };
    folioChargeId = charge.id;
  }

  const { error } = await supabase.from("spa_memberships").insert({
    property_id: parsed.data.propertyId,
    guest_id: parsed.data.guestId,
    plan_name: parsed.data.planName,
    valid_from: parsed.data.validFrom,
    valid_until: parsed.data.validUntil,
    total_allowance: parsed.data.allowance,
    remaining_allowance: parsed.data.allowance,
    sold_amount_minor: parsed.data.soldAmountMinor,
    folio_charge_id: folioChargeId,
    status: "active",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/memberships");
  return { success: true };
}

export async function usePackageAllowance(formData: FormData) {
  const parsed = UseAllowanceSchema.safeParse({
    membershipId: formData.get("membershipId"),
    bookingId: formData.get("bookingId"),
    unitsUsed: formData.get("unitsUsed"),
    note: formData.get("note"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid allowance usage input" };

  const supabase = await createClient();
  const { data: membership, error: membershipErr } = await supabase
    .from("spa_memberships")
    .select("id, property_id, status, remaining_allowance")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();

  if (membershipErr) return { error: membershipErr.message };
  if (!membership) return { error: "Membership not found" };

  await assertActivePropertyAccess(membership.property_id);
  await requirePermission("spa.manage", membership.property_id);

  if (membership.status !== "active") return { error: "Membership is not active" };
  if (membership.remaining_allowance < parsed.data.unitsUsed) return { error: "Insufficient package allowance" };

  const nextRemaining = membership.remaining_allowance - parsed.data.unitsUsed;

  const { error: updateErr } = await supabase
    .from("spa_memberships")
    .update({ remaining_allowance: nextRemaining })
    .eq("id", membership.id);

  if (updateErr) return { error: updateErr.message };

  const { error: usageErr } = await supabase.from("spa_membership_usage").insert({
    property_id: membership.property_id,
    membership_id: membership.id,
    booking_id: parsed.data.bookingId || null,
    units_used: parsed.data.unitsUsed,
    note: parsed.data.note || null,
  });

  if (usageErr) return { error: usageErr.message };

  revalidatePath("/dashboard/spa/memberships");
  return { success: true };
}

export async function renewMembership(formData: FormData) {
  const parsed = RenewMembershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
    nextValidUntil: formData.get("nextValidUntil"),
    addAllowance: formData.get("addAllowance"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid renew input" };

  const supabase = await createClient();
  const { data: membership, error: membershipErr } = await supabase
    .from("spa_memberships")
    .select("id, property_id, total_allowance, remaining_allowance")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();

  if (membershipErr) return { error: membershipErr.message };
  if (!membership) return { error: "Membership not found" };

  await assertActivePropertyAccess(membership.property_id);
  await requirePermission("spa.manage", membership.property_id);

  const { error } = await supabase
    .from("spa_memberships")
    .update({
      status: "active",
      valid_until: parsed.data.nextValidUntil,
      total_allowance: membership.total_allowance + parsed.data.addAllowance,
      remaining_allowance: membership.remaining_allowance + parsed.data.addAllowance,
    })
    .eq("id", membership.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/memberships");
  return { success: true };
}

export async function expireMembership(formData: FormData) {
  const parsed = z.object({ membershipId: z.string().uuid() }).safeParse({ membershipId: formData.get("membershipId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid membership input" };

  const supabase = await createClient();
  const { data: membership, error: membershipErr } = await supabase
    .from("spa_memberships")
    .select("id, property_id")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();

  if (membershipErr) return { error: membershipErr.message };
  if (!membership) return { error: "Membership not found" };

  await assertActivePropertyAccess(membership.property_id);
  await requirePermission("spa.manage", membership.property_id);

  const { error } = await supabase
    .from("spa_memberships")
    .update({ status: "expired" })
    .eq("id", membership.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spa/memberships");
  return { success: true };
}

export async function getSpaBookingsContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [servicesRes, therapistsRes, roomsRes, bookingsRes, reservationsRes, guests] = await Promise.all([
    supabase.from("spa_services").select("id, name, duration_minutes, price_minor").eq("property_id", propertyId).eq("is_active", true).order("name"),
    supabase.from("spa_therapists").select("id, display_name, is_active").eq("property_id", propertyId).eq("is_active", true).order("display_name"),
    supabase.from("spa_treatment_rooms").select("id, name, is_active").eq("property_id", propertyId).eq("is_active", true).order("name"),
    supabase
      .from("spa_bookings")
      .select("id, reservation_id, guest_id, service_id, therapist_id, room_id, starts_at, ends_at, status, notes, posted_charge_id, spa_services(name, price_minor), spa_therapists(display_name), spa_treatment_rooms(name), guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .order("starts_at", { ascending: true })
      .limit(250),
    supabase
      .from("reservations")
      .select("id, guests(first_name,last_name), check_in, status")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("check_in", { ascending: false })
      .limit(200),
    getGuestsForPropertyScope(supabase, propertyId),
  ]);

  return {
    services: servicesRes.data ?? [],
    therapists: therapistsRes.data ?? [],
    rooms: roomsRes.data ?? [],
    bookings: bookingsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    guests,
  };
}

export async function getSpaTherapistsContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [therapistsRes, servicesRes, qualificationsRes, shiftsRes] = await Promise.all([
    supabase.from("spa_therapists").select("id, display_name, is_active, created_at").eq("property_id", propertyId).order("display_name"),
    supabase.from("spa_services").select("id, name").eq("property_id", propertyId).eq("is_active", true).order("name"),
    supabase
      .from("spa_therapist_qualifications")
      .select("id, therapist_id, service_id, spa_services(name)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("spa_therapist_shifts")
      .select("id, therapist_id, starts_at, ends_at, status, notes")
      .eq("property_id", propertyId)
      .order("starts_at", { ascending: true })
      .limit(400),
  ]);

  return {
    therapists: therapistsRes.data ?? [],
    services: servicesRes.data ?? [],
    qualifications: qualificationsRes.data ?? [],
    shifts: shiftsRes.data ?? [],
  };
}

export async function getSpaMembershipsContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [membershipsRes, usageRes, guests, reservationsRes] = await Promise.all([
    supabase
      .from("spa_memberships")
      .select("id, guest_id, plan_name, status, valid_from, valid_until, total_allowance, remaining_allowance, sold_amount_minor, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("spa_membership_usage")
      .select("id, membership_id, booking_id, units_used, note, used_at")
      .eq("property_id", propertyId)
      .order("used_at", { ascending: false })
      .limit(400),
    getGuestsForPropertyScope(supabase, propertyId),
    supabase
      .from("reservations")
      .select("id, guests(first_name,last_name), check_in, status")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("check_in", { ascending: false })
      .limit(200),
  ]);

  return {
    memberships: membershipsRes.data ?? [],
    usage: usageRes.data ?? [],
    guests,
    reservations: reservationsRes.data ?? [],
  };
}

// ─── Spa Services ────────────────────────────────────────────────────────────

export async function getSpaServicesContext(propertyId: string) {
  const supabase = await createClient();
  await assertActivePropertyAccess(propertyId);

  const [servicesRes] = await Promise.all([
    supabase
      .from("spa_services")
      .select("id, name, duration_minutes, price_minor, description, is_active")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  return {
    services: servicesRes.data ?? [],
  };
}

export async function createSpaService(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = CreateSpaServiceSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { propertyId, name, durationMin, priceMinor, description } = parsed.data;
  const supabase = await createClient();
  await requirePermission("spa.manage", propertyId);

  const { error } = await supabase.from("spa_services").insert({
    property_id: propertyId,
    name,
    duration_minutes: durationMin,
    price_minor: priceMinor,
    description: description || null,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/spa/services");
  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

export async function updateSpaService(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = UpdateSpaServiceSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { serviceId, propertyId, name, durationMin, priceMinor, description, isActive } = parsed.data;
  const supabase = await createClient();
  await requirePermission("spa.manage", propertyId);

  const { error } = await supabase
    .from("spa_services")
    .update({
      name,
      duration_minutes: durationMin,
      price_minor: priceMinor,
      description: description || null,
      is_active: isActive,
    })
    .eq("id", serviceId)
    .eq("property_id", propertyId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/spa/services");
  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

// ─── Spa Treatment Rooms ─────────────────────────────────────────────────────

export async function getSpaTreatmentRoomsContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data } = await supabase
    .from("spa_treatment_rooms")
    .select("id, name, is_active, created_at")
    .eq("property_id", propertyId)
    .order("name", { ascending: true });

  return {
    rooms: data ?? [],
  };
}

export async function createSpaTreatmentRoom(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = CreateSpaTreatmentRoomSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { propertyId, name } = parsed.data;
  await assertActivePropertyAccess(propertyId);
  await requirePermission("spa.manage", propertyId);

  const supabase = await createClient();
  const { error } = await supabase.from("spa_treatment_rooms").insert({
    property_id: propertyId,
    name,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/spa/rooms");
  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}

export async function updateSpaTreatmentRoom(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = UpdateSpaTreatmentRoomSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { propertyId, roomId, name, isActive } = parsed.data;
  await assertActivePropertyAccess(propertyId);
  await requirePermission("spa.manage", propertyId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("spa_treatment_rooms")
    .update({
      name,
      is_active: isActive,
    })
    .eq("id", roomId)
    .eq("property_id", propertyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/spa/rooms");
  revalidatePath("/dashboard/spa/bookings");
  return { success: true };
}
