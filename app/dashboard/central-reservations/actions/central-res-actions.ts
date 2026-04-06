"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRoomTypeAvailability } from "@/lib/pms/availability";
import { getScopedPropertiesForCurrentUser } from "@/lib/pms/property-scope";
import { hasPermission, requirePermission } from "@/lib/staff/server-permissions";
import { transferReservationAcrossProperties } from "@/lib/pms/reservation-transfer";

const SearchSchema = z.object({
  checkIn: z.string().date(),
  checkOut: z.string().date(),
});

const CreateCentralReservationSchema = z.object({
  targetPropertyId: z.string().uuid(),
  guestId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  adults: z.coerce.number().int().min(1).max(10).default(1),
  children: z.coerce.number().int().min(0).max(10).default(0),
  source: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const TransferSchema = z.object({
  sourceReservationId: z.string().uuid(),
  targetPropertyId: z.string().uuid(),
  targetRoomTypeId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

async function getCurrentOrgAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { organizationId: "", userId: "" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    organizationId: profile?.organization_id ?? "",
    userId: user.id,
  };
}

async function getOrgProperties() {
  const scoped = await getScopedPropertiesForCurrentUser();
  return scoped.properties;
}

export async function searchAcrossPropertiesByRange(input: { checkIn: string; checkOut: string }) {
  const parsed = SearchSchema.safeParse(input);
  if (!parsed.success) return { rows: [], error: parsed.error.issues[0]?.message ?? "Invalid date range" };

  const properties = await getOrgProperties();
  const availability = await Promise.all(
    properties.map(async (property) => {
      const allowed = await hasPermission(property.id, "reservations.view");
      if (!allowed) return [] as Array<Record<string, unknown>>;

      const roomTypes = await getRoomTypeAvailability({
        propertyId: property.id,
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
      });

      return roomTypes.map((row) => ({
        propertyId: property.id,
        propertyName: property.name,
        ...row,
      }));
    }),
  );

  return { rows: availability.flat() };
}

export async function createCentralReservation(formData: FormData) {
  const parsed = CreateCentralReservationSchema.safeParse({
    targetPropertyId: formData.get("targetPropertyId"),
    guestId: formData.get("guestId"),
    roomTypeId: formData.get("roomTypeId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults") || 1,
    children: formData.get("children") || 0,
    source: formData.get("source"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid central reservation input" };

  await requirePermission("reservations.create", parsed.data.targetPropertyId);

  const supabase = await createClient();
  const { userId } = await getCurrentOrgAndUser();

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      property_id: parsed.data.targetPropertyId,
      guest_id: parsed.data.guestId,
      status: "confirmed",
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      source: parsed.data.source || "central_res",
      notes: parsed.data.notes || null,
      created_by: userId || null,
    })
    .select("id")
    .single();

  if (reservationError || !reservation) {
    return { error: reservationError?.message ?? "Unable to create reservation" };
  }

  const { error: rrError } = await supabase.from("reservation_rooms").insert({
    reservation_id: reservation.id,
    room_type_id: parsed.data.roomTypeId,
    room_id: null,
  });

  if (rrError) return { error: rrError.message };

  revalidatePath("/dashboard/central-reservations");
  revalidatePath(`/dashboard/reservations/${reservation.id}`);
  return { success: true, reservationId: reservation.id };
}

export async function transferGuestBetweenProperties(formData: FormData) {
  const parsed = TransferSchema.safeParse({
    sourceReservationId: formData.get("sourceReservationId"),
    targetPropertyId: formData.get("targetPropertyId"),
    targetRoomTypeId: formData.get("targetRoomTypeId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid transfer input" };

  const supabase = await createClient();
  const { data: sourceReservation } = await supabase
    .from("reservations")
    .select("id, property_id")
    .eq("id", parsed.data.sourceReservationId)
    .maybeSingle();

  if (!sourceReservation) return { error: "Source reservation not found" };

  await requirePermission("reservations.update", sourceReservation.property_id);
  await requirePermission("reservations.create", parsed.data.targetPropertyId);

  const result = await transferReservationAcrossProperties({
    sourceReservationId: parsed.data.sourceReservationId,
    targetPropertyId: parsed.data.targetPropertyId,
    targetRoomTypeId: parsed.data.targetRoomTypeId,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    notes: parsed.data.notes || undefined,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/central-reservations");
  return { success: true, targetReservationId: result.targetReservationId };
}

export async function getCentralReservationsContext() {
  const supabase = await createClient();
  const scoped = await getScopedPropertiesForCurrentUser();

  if (!scoped.organizationId) {
    return { properties: [], guests: [], roomTypes: [], reservations: [] };
  }

  const scopedProperties = scoped.properties.map((property) => ({ id: property.id, name: property.name }));
  const propertiesWithCapabilities = [] as Array<{
    id: string;
    name: string;
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
  }>;

  for (const property of scopedProperties) {
    const [canView, canCreate, canUpdate] = await Promise.all([
      hasPermission(property.id, "reservations.view"),
      hasPermission(property.id, "reservations.create"),
      hasPermission(property.id, "reservations.update"),
    ]);
    propertiesWithCapabilities.push({
      id: property.id,
      name: property.name,
      canView,
      canCreate,
      canUpdate,
    });
  }

  const viewPropertyIds = propertiesWithCapabilities.filter((property) => property.canView).map((property) => property.id);
  const creatablePropertyIds = propertiesWithCapabilities.filter((property) => property.canCreate).map((property) => property.id);

  const [guestsRes, roomTypesRes, reservationsRes] = await Promise.all([
    supabase
      .from("guests")
      .select("id, first_name, last_name")
      .eq("organization_id", scoped.organizationId)
      .order("first_name", { ascending: true })
      .limit(400),
    creatablePropertyIds.length > 0
      ? supabase
          .from("room_types")
          .select("id, property_id, name")
          .in("property_id", creatablePropertyIds)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    viewPropertyIds.length > 0
      ? supabase
          .from("reservations")
          .select("id, property_id, check_in, check_out, status, guests(first_name,last_name), properties(name)")
          .in("property_id", viewPropertyIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    properties: propertiesWithCapabilities,
    guests: guestsRes.data ?? [],
    roomTypes: roomTypesRes.data ?? [],
    reservations: reservationsRes.data ?? [],
  };
}
