"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const ConnectChannelSchema = z.object({
  propertyId: z.string().uuid(),
  channelName: z.string().min(2).max(80),
});

const SyncSchema = z.object({
  channelConnectionId: z.string().uuid(),
});

const ProcessOtaSchema = z.object({
  propertyId: z.string().uuid(),
  channelName: z.string().min(2).max(80),
  externalBookingId: z.string().min(1).max(120),
  guestFirstName: z.string().min(1).max(80),
  guestLastName: z.string().min(1).max(80),
  guestEmail: z.string().email(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  roomTypeId: z.string().uuid(),
  totalRateMinor: z.coerce.number().int().min(0),
});

async function ensureConnectionInActiveProperty(channelConnectionId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("channel_connections")
    .select("id")
    .eq("id", channelConnectionId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Channel connection not found for the active property");
  }
}

export async function getChannelsContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [connectionsRes, bookingsRes, roomTypesRes] = await Promise.all([
    supabase
      .from("channel_connections")
      .select("id, channel_name, status, connected_at, last_sync_at, last_error, created_at")
      .eq("property_id", propertyId)
      .order("channel_name", { ascending: true }),
    supabase
      .from("channel_bookings")
      .select("id, channel_name, external_booking_id, reservation_id, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("room_types")
      .select("id, name")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  const connections = connectionsRes.data ?? [];

  return {
    connections,
    bookings: bookingsRes.data ?? [],
    roomTypes: roomTypesRes.data ?? [],
    summary: {
      connectedChannels: connections.filter((c) => c.status === "connected").length,
      totalChannels: connections.length,
      mappedBookings: (bookingsRes.data ?? []).length,
    },
  };
}

export async function connectChannel(formData: FormData) {
  const parsed = ConnectChannelSchema.safeParse({
    propertyId: formData.get("propertyId"),
    channelName: formData.get("channelName"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid channel" };

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();

  const { error } = await supabase
    .from("channel_connections")
    .upsert(
      {
        property_id: parsed.data.propertyId,
        channel_name: parsed.data.channelName.trim().toLowerCase(),
        status: "connected",
        connected_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "property_id,channel_name" },
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/channels");
  return { success: true };
}

async function setSyncTime(channelConnectionId: string, status: "connected" | "disconnected" = "connected") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("channel_connections")
    .update({ status, last_sync_at: new Date().toISOString(), last_error: null })
    .eq("id", channelConnectionId);
  return error;
}

export async function syncAvailability(formData: FormData) {
  const parsed = SyncSchema.safeParse({
    channelConnectionId: formData.get("channelConnectionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid sync request" };

  await ensureConnectionInActiveProperty(parsed.data.channelConnectionId);

  const error = await setSyncTime(parsed.data.channelConnectionId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/channels");
  return { success: true };
}

export async function syncRates(formData: FormData) {
  const parsed = SyncSchema.safeParse({
    channelConnectionId: formData.get("channelConnectionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid sync request" };

  await ensureConnectionInActiveProperty(parsed.data.channelConnectionId);

  const error = await setSyncTime(parsed.data.channelConnectionId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/channels");
  return { success: true };
}

export async function processOTABooking(formData: FormData) {
  const parsed = ProcessOtaSchema.safeParse({
    propertyId: formData.get("propertyId"),
    channelName: formData.get("channelName"),
    externalBookingId: formData.get("externalBookingId"),
    guestFirstName: formData.get("guestFirstName"),
    guestLastName: formData.get("guestLastName"),
    guestEmail: formData.get("guestEmail"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    roomTypeId: formData.get("roomTypeId"),
    totalRateMinor: formData.get("totalRateMinor"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid OTA payload" };

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", parsed.data.propertyId)
    .single();

  if (propertyError) return { error: propertyError.message };

  const channelName = parsed.data.channelName.trim().toLowerCase();

  const { data: existingMap } = await supabase
    .from("channel_bookings")
    .select("id")
    .eq("channel_name", channelName)
    .eq("external_booking_id", parsed.data.externalBookingId)
    .maybeSingle();

  if (existingMap) return { error: "External booking already mapped." };

  let guestId: string;

  const { data: guestByEmail } = await supabase
    .from("guests")
    .select("id")
    .eq("organization_id", property.organization_id)
    .eq("email", parsed.data.guestEmail)
    .maybeSingle();

  if (guestByEmail?.id) {
    guestId = guestByEmail.id;
  } else {
    const { data: createdGuest, error: guestError } = await supabase
      .from("guests")
      .insert({
        organization_id: property.organization_id,
        first_name: parsed.data.guestFirstName,
        last_name: parsed.data.guestLastName,
        email: parsed.data.guestEmail,
      })
      .select("id")
      .single();

    if (guestError) return { error: guestError.message };
    guestId = createdGuest.id;
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      property_id: parsed.data.propertyId,
      guest_id: guestId,
      status: "confirmed",
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      source: `OTA:${channelName}`,
      total_rate_minor: parsed.data.totalRateMinor,
    })
    .select("id")
    .single();

  if (reservationError) return { error: reservationError.message };

  const { error: rrError } = await supabase.from("reservation_rooms").insert({
    reservation_id: reservation.id,
    room_type_id: parsed.data.roomTypeId,
  });

  if (rrError) return { error: rrError.message };

  const { error: mapError } = await supabase.from("channel_bookings").insert({
    property_id: parsed.data.propertyId,
    channel_name: channelName,
    external_booking_id: parsed.data.externalBookingId,
    reservation_id: reservation.id,
  });

  if (mapError) return { error: mapError.message };

  revalidatePath("/dashboard/channels");
  revalidatePath("/dashboard/reservations");
  return { success: true };
}
