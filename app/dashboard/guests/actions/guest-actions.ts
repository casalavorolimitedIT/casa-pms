"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizationId } from "@/app/dashboard/actions/property-actions";
import { getLinkedGuestsForGuest } from "@/lib/pms/guest-identity";

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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const formOrganizationId = formData.get("organizationId");
  const organizationId =
    typeof formOrganizationId === "string" && formOrganizationId.trim().length > 0
      ? formOrganizationId.trim()
      : await getUserOrganizationId();

  if (!organizationId) {
    return { error: "No organization linked to your account." };
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
      organization_id: organizationId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/guests");
  return { id: data.id };
}

/**
 * Lightweight guest creation for inline "Quick Add Guest" dialogs.
 * Takes only firstName, lastName + optional email/phone.
 * Returns the created guest's id and display label — no redirect.
 */
export async function createGuestQuick(formData: FormData): Promise<
  | { error: string }
  | { id: string; firstName: string; lastName: string; email: string | null }
> {
  const supabase = await createClient();

  const QuickSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(80),
    lastName: z.string().min(1, "Last name is required").max(80),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
  });

  const parsed = QuickSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const formOrganizationId = formData.get("organizationId");
  const organizationId =
    typeof formOrganizationId === "string" && formOrganizationId.trim().length > 0
      ? formOrganizationId.trim()
      : await getUserOrganizationId();

  if (!organizationId) {
    return { error: "No organization linked to your account." };
  }

  const { data, error } = await supabase
    .from("guests")
    .insert({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      organization_id: organizationId,
    })
    .select("id, first_name, last_name, email")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/guests");
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
  };
}

export async function updateGuest(id: string, formData: FormData) {
  const supabase = await createClient();

  const parsed = GuestSchema.safeParse({
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

  const [guestRes, prefsRes, vipRes, reservationsRes] = await Promise.all([
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
    supabase
      .from("reservations")
      .select("id, property_id, check_in, check_out, status")
      .eq("guest_id", id),
  ]);

  if (guestRes.error) return { error: guestRes.error.message };

  const reservations = reservationsRes.data ?? [];
  const linkedGuestsResult = await getLinkedGuestsForGuest(id);
  const linkedGuests = linkedGuestsResult.guests ?? [];
  const linkedGuestIds = linkedGuests.map((guest) => guest.id);

  const linkedReservationsRes = linkedGuestIds.length > 0
    ? await supabase
        .from("reservations")
        .select("id, guest_id, property_id, check_in, check_out, status, properties(name), guests(first_name,last_name)")
        .in("guest_id", linkedGuestIds)
        .order("check_in", { ascending: false })
        .limit(200)
    : { data: [], error: null };

  const linkedStayHistory = (linkedReservationsRes.data ?? []).map((reservation) => {
    const propertyRaw = reservation.properties as { name?: string } | Array<{ name?: string }> | null;
    const property = Array.isArray(propertyRaw) ? propertyRaw[0] : propertyRaw;
    const guestRaw = reservation.guests as { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null;
    const linkedGuest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    return {
      id: reservation.id,
      linkedGuestName: `${linkedGuest?.first_name ?? ""} ${linkedGuest?.last_name ?? ""}`.trim() || reservation.guest_id.slice(0, 8),
      propertyName: property?.name ?? reservation.property_id.slice(0, 8),
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      status: reservation.status,
    };
  });

  const reservationIds = reservations.map((row) => row.id);
  const propertyIds = Array.from(new Set(reservations.map((row) => row.property_id)));

  const [bookingsRes, settlementsRes, membershipsRes, usageRes, foliosRes] = await Promise.all([
    propertyIds.length > 0
      ? supabase
          .from("spa_bookings")
          .select("id, property_id, reservation_id, starts_at, ends_at, status, created_at, posted_charge_id, spa_services(name), spa_therapists(display_name), spa_treatment_rooms(name)")
          .in("property_id", propertyIds)
          .or(`guest_id.eq.${id}${reservationIds.length > 0 ? `,reservation_id.in.(${reservationIds.join(",")})` : ""}`)
          .order("starts_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length > 0
      ? supabase
          .from("spa_settlements")
          .select("id, booking_id, amount_minor, method, status, reference, created_at")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length > 0
      ? supabase
          .from("spa_memberships")
          .select("id, property_id, plan_name, status, valid_from, valid_until, sold_amount_minor, folio_charge_id, created_at")
          .eq("guest_id", id)
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length > 0
      ? supabase
          .from("spa_membership_usage")
          .select("id, property_id, membership_id, booking_id, units_used, note, used_at")
          .in("property_id", propertyIds)
          .order("used_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
    reservationIds.length > 0
      ? supabase
          .from("folios")
          .select("id, reservation_id, currency_code")
          .in("reservation_id", reservationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const bookings = bookingsRes.data ?? [];
  const bookingIds = bookings.map((row) => row.id);
  const settlements = (settlementsRes.data ?? []).filter((row) => bookingIds.includes(row.booking_id));
  const memberships = membershipsRes.data ?? [];
  const membershipIds = memberships.map((row) => row.id);
  const usage = (usageRes.data ?? []).filter((row) => membershipIds.includes(row.membership_id));
  const folios = foliosRes.data ?? [];
  const folioIds = folios.map((row) => row.id);

  const chargesRes = folioIds.length > 0
    ? await supabase
        .from("folio_charges")
        .select("id, folio_id, amount_minor, category, description, created_at")
        .in("folio_id", folioIds)
        .in("category", ["spa", "spa_membership"])
        .order("created_at", { ascending: false })
        .limit(400)
    : { data: [], error: null };

  const folioChargeRows = chargesRes.data ?? [];
  const folioById = new Map(folios.map((folio) => [folio.id, folio]));

  const spaServiceTimeline = [
    ...bookings.map((booking) => {
      const serviceRaw = booking.spa_services as { name?: string } | Array<{ name?: string }> | null;
      const service = Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw;
      const therapistRaw = booking.spa_therapists as { display_name?: string } | Array<{ display_name?: string }> | null;
      const therapist = Array.isArray(therapistRaw) ? therapistRaw[0] : therapistRaw;
      const roomRaw = booking.spa_treatment_rooms as { name?: string } | Array<{ name?: string }> | null;
      const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
      return {
        id: `booking-${booking.id}`,
        kind: "booking",
        at: booking.starts_at,
        title: service?.name ? `Spa booking · ${service.name}` : "Spa booking",
        subtitle: `${booking.status}${therapist?.display_name ? ` · ${therapist.display_name}` : ""}${room?.name ? ` · ${room.name}` : ""}`,
      };
    }),
    ...usage.map((event) => ({
      id: `usage-${event.id}`,
      kind: "membership_usage",
      at: event.used_at,
      title: `Membership usage · ${event.units_used} unit${event.units_used === 1 ? "" : "s"}`,
      subtitle: event.note || "Spa package allowance consumed",
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const spaFinancialTimeline = [
    ...folioChargeRows.map((charge) => {
      const folio = folioById.get(charge.folio_id);
      return {
        id: `charge-${charge.id}`,
        kind: "folio_charge",
        at: charge.created_at,
        title: charge.category === "spa_membership" ? "Spa membership charge" : "Spa folio charge",
        subtitle: charge.description || (folio ? `Folio ${folio.id.slice(0, 8).toUpperCase()}` : "Folio charge"),
        amountMinor: charge.amount_minor,
        currencyCode: folio?.currency_code ?? "USD",
      };
    }),
    ...settlements.map((settlement) => ({
      id: `settlement-${settlement.id}`,
      kind: "spa_settlement",
      at: settlement.created_at,
      title: "Spa standalone settlement",
      subtitle: `${settlement.method}${settlement.reference ? ` · ${settlement.reference}` : ""}${settlement.status ? ` · ${settlement.status}` : ""}`,
      amountMinor: settlement.amount_minor,
      currencyCode: "USD",
    })),
    ...memberships
      .filter((membership) => membership.sold_amount_minor > 0)
      .map((membership) => ({
        id: `membership-sale-${membership.id}`,
        kind: "membership_sale",
        at: membership.created_at,
        title: `Membership sold · ${membership.plan_name}`,
        subtitle: `${membership.status} · valid ${membership.valid_from} to ${membership.valid_until}`,
        amountMinor: membership.sold_amount_minor,
        currencyCode: "USD",
      })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    guest: guestRes.data,
    preferences: prefsRes.data ?? [],
    vipFlag: vipRes.data ?? null,
    linkedGuests,
    linkedGuestLinks: linkedGuestsResult.links ?? [],
    linkedStayHistory,
    spaServiceTimeline,
    spaFinancialTimeline,
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
