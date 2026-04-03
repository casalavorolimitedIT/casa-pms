import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPayment } from "@/lib/payments/provider";
import { createAdminClient } from "@/lib/supabase/admin";

const verifySchema = z.object({
  currency: z.string().min(3).max(3),
  reference: z.string().min(3),
  bookingIntentId: z.string().uuid().optional(),
});

function isVerifiedStatus(status: string | undefined) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === "success" || normalized === "succeeded";
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = verifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment verification payload" },
      { status: 400 },
    );
  }

  const result = await verifyPayment(parsed.data);

  if (!parsed.data.bookingIntentId) {
    return NextResponse.json(result, { status: 200 });
  }

  if (!isVerifiedStatus((result as { status?: string }).status)) {
    return NextResponse.json(
      { error: "Payment is not verified yet.", paymentStatus: (result as { status?: string }).status ?? "unknown" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: intent, error: intentError } = await admin
    .from("booking_intents")
    .select("id, property_id, room_type_id, guest_email, guest_first_name, guest_last_name, check_in, check_out, adults, children, total_rate_minor, payment_status, reservation_id")
    .eq("id", parsed.data.bookingIntentId)
    .single();

  if (intentError) {
    return NextResponse.json({ error: intentError.message }, { status: 400 });
  }

  if (intent.reservation_id) {
    return NextResponse.json({ ...result, reservationId: intent.reservation_id }, { status: 200 });
  }

  const { data: property, error: propertyError } = await admin
    .from("properties")
    .select("organization_id")
    .eq("id", intent.property_id)
    .single();

  if (propertyError) {
    return NextResponse.json({ error: propertyError.message }, { status: 400 });
  }

  let guestId: string;

  const { data: existingGuest } = await admin
    .from("guests")
    .select("id")
    .eq("organization_id", property.organization_id)
    .eq("email", intent.guest_email)
    .maybeSingle();

  if (existingGuest?.id) {
    guestId = existingGuest.id;
  } else {
    const { data: newGuest, error: guestError } = await admin
      .from("guests")
      .insert({
        organization_id: property.organization_id,
        first_name: intent.guest_first_name,
        last_name: intent.guest_last_name,
        email: intent.guest_email,
      })
      .select("id")
      .single();

    if (guestError) {
      return NextResponse.json({ error: guestError.message }, { status: 400 });
    }

    guestId = newGuest.id;
  }

  const { data: reservation, error: reservationError } = await admin
    .from("reservations")
    .insert({
      property_id: intent.property_id,
      guest_id: guestId,
      status: "confirmed",
      check_in: intent.check_in,
      check_out: intent.check_out,
      adults: intent.adults,
      children: intent.children,
      source: "Direct Booking",
      total_rate_minor: intent.total_rate_minor,
    })
    .select("id")
    .single();

  if (reservationError) {
    return NextResponse.json({ error: reservationError.message }, { status: 400 });
  }

  const { error: roomError } = await admin.from("reservation_rooms").insert({
    reservation_id: reservation.id,
    room_type_id: intent.room_type_id,
  });

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  const { error: intentUpdateError } = await admin
    .from("booking_intents")
    .update({ payment_status: "verified", reservation_id: reservation.id, updated_at: new Date().toISOString() })
    .eq("id", intent.id);

  if (intentUpdateError) {
    return NextResponse.json({ error: intentUpdateError.message }, { status: 400 });
  }

  return NextResponse.json({ ...result, reservationId: reservation.id }, { status: 200 });
}
