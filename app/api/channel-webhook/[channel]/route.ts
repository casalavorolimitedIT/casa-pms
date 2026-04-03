import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapBookingComPayload } from "@/lib/channels/booking-com";
import { mapExpediaPayload } from "@/lib/channels/expedia";
import { mapAirbnbPayload } from "@/lib/channels/airbnb";

const payloadSchema = z.object({
  propertyId: z.string().uuid(),
});

function normalizeChannel(channel: string) {
  return channel.trim().toLowerCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel: rawChannel } = await params;
  const channel = normalizeChannel(rawChannel);
  const payload = await request.json();

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const mapper = channel === "booking-com"
    ? mapBookingComPayload
    : channel === "expedia"
      ? mapExpediaPayload
      : channel === "airbnb"
        ? mapAirbnbPayload
        : null;

  if (!mapper) {
    return NextResponse.json({ error: `Unsupported channel: ${channel}` }, { status: 400 });
  }

  const mapped = mapper(payload);
  if (!mapped) {
    return NextResponse.json({ error: "Unable to map channel payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingMap } = await admin
    .from("channel_bookings")
    .select("id")
    .eq("channel_name", channel)
    .eq("external_booking_id", mapped.externalBookingId)
    .maybeSingle();

  if (existingMap) {
    return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
  }

  const { data: property, error: propertyError } = await admin
    .from("properties")
    .select("organization_id")
    .eq("id", parsed.data.propertyId)
    .single();

  if (propertyError) {
    return NextResponse.json({ error: propertyError.message }, { status: 400 });
  }

  let guestId: string;

  const { data: existingGuest } = await admin
    .from("guests")
    .select("id")
    .eq("organization_id", property.organization_id)
    .eq("email", mapped.guestEmail)
    .maybeSingle();

  if (existingGuest?.id) {
    guestId = existingGuest.id;
  } else {
    const { data: createdGuest, error: guestError } = await admin
      .from("guests")
      .insert({
        organization_id: property.organization_id,
        first_name: mapped.guestFirstName,
        last_name: mapped.guestLastName,
        email: mapped.guestEmail,
      })
      .select("id")
      .single();

    if (guestError) return NextResponse.json({ error: guestError.message }, { status: 400 });
    guestId = createdGuest.id;
  }

  const { data: reservation, error: reservationError } = await admin
    .from("reservations")
    .insert({
      property_id: parsed.data.propertyId,
      guest_id: guestId,
      status: "confirmed",
      check_in: mapped.checkIn,
      check_out: mapped.checkOut,
      source: `OTA:${channel}`,
      total_rate_minor: mapped.totalRateMinor,
    })
    .select("id")
    .single();

  if (reservationError) {
    return NextResponse.json({ error: reservationError.message }, { status: 400 });
  }

  const { error: reservationRoomError } = await admin.from("reservation_rooms").insert({
    reservation_id: reservation.id,
    room_type_id: mapped.roomTypeId,
  });

  if (reservationRoomError) {
    return NextResponse.json({ error: reservationRoomError.message }, { status: 400 });
  }

  const { error: mapError } = await admin.from("channel_bookings").insert({
    property_id: parsed.data.propertyId,
    channel_name: channel,
    external_booking_id: mapped.externalBookingId,
    reservation_id: reservation.id,
  });

  if (mapError) {
    return NextResponse.json({ error: mapError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, reservationId: reservation.id }, { status: 200 });
}
