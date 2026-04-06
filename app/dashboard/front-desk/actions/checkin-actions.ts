"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { initializePayment } from "@/lib/payments/provider";
import { getActivePropertyId } from "@/lib/pms/property-context";

const CheckInSchema = z.object({
  reservationId: z.string().uuid(),
  roomId: z.string().uuid(),
  idVerified: z.coerce.boolean().default(false),
  paymentEmail: z.string().email().optional().or(z.literal("")),
  paymentCurrency: z.string().default("USD"),
  setupAmountMinor: z.coerce.number().int().min(0).default(0),
  postEarlyFee: z.coerce.boolean().default(false),
});

const CheckOutSchema = z.object({
  reservationId: z.string().uuid(),
  folioId: z.string().uuid(),
  paymentMethod: z.enum(["card", "cash", "bank_transfer"]).default("card"),
  currency: z.string().default("USD"),
  amountMinor: z.coerce.number().int().min(0),
  email: z.string().email().optional().or(z.literal("")),
  postLateFee: z.coerce.boolean().default(false),
});

const RoomMoveSchema = z.object({
  reservationId: z.string().uuid(),
  toRoomId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

async function getActivePropertyIdOrThrow() {
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) {
    throw new Error("No active property selected");
  }

  return activePropertyId;
}

export async function getFrontDeskSnapshot(propertyId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [arrivalsRes, departuresRes, inHouseRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .eq("check_in", today)
      .in("status", ["confirmed", "tentative"])
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .eq("check_out", today)
      .in("status", ["checked_in"])
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .eq("status", "checked_in")
      .order("check_out", { ascending: true }),
  ]);

  return {
    arrivals: arrivalsRes.data ?? [],
    departures: departuresRes.data ?? [],
    inHouse: inHouseRes.data ?? [],
  };
}

export async function getCheckInReservationContext(reservationId: string) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, property_id, status, check_in, check_out, guests(id, first_name, last_name), reservation_rooms(room_type_id, room_id)",
    )
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .single();

  if (!reservation) return { reservation: null, availableRooms: [], propertySettings: null };

  const assigned = (reservation.reservation_rooms as Array<{ room_type_id: string }>)[0];
  const roomTypeId = assigned?.room_type_id;

  const [roomsRes, settingsRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, status")
      .eq("property_id", reservation.property_id)
      .eq("room_type_id", roomTypeId)
      .eq("status", "vacant")
      .order("room_number", { ascending: true }),
    supabase
      .from("property_settings")
      .select("check_in_time, early_checkin_fee_minor")
      .eq("property_id", activePropertyId)
      .maybeSingle(),
  ]);

  const settingsRow = settingsRes.data;

  return {
    reservation,
    availableRooms: roomsRes.data ?? [],
    propertySettings: settingsRow
      ? {
          checkInTime: (settingsRow.check_in_time as string).slice(0, 5),
          earlyCheckinFeeMinor: (settingsRow.early_checkin_fee_minor as number) ?? 0,
        }
      : { checkInTime: "15:00", earlyCheckinFeeMinor: 0 },
  };
}

export async function confirmCheckIn(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = CheckInSchema.safeParse({
    reservationId: formData.get("reservationId"),
    roomId: formData.get("roomId"),
    idVerified: formData.get("idVerified") === "on",
    paymentEmail: formData.get("paymentEmail"),
    paymentCurrency: formData.get("paymentCurrency"),
    setupAmountMinor: formData.get("setupAmountMinor"),
    postEarlyFee: formData.get("postEarlyFee") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!parsed.data.idVerified) return { error: "ID verification is required to check in." };

  const { reservationId, roomId, setupAmountMinor, paymentCurrency, paymentEmail, postEarlyFee } = parsed.data;

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, status, property_id")
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .single();

  if (!reservation) return { error: "Reservation not found" };
  if (reservation.status === "checked_in") return { success: true };

  await supabase
    .from("reservation_rooms")
    .update({ room_id: roomId })
    .eq("reservation_id", reservationId);

  await supabase.from("rooms").update({ status: "occupied" }).eq("id", roomId);

  await supabase.from("check_in_records").insert({
    reservation_id: reservationId,
    checked_in_at: new Date().toISOString(),
  });

  await supabase
    .from("reservations")
    .update({ status: "checked_in", updated_at: new Date().toISOString() })
    .eq("id", reservationId);

  // Ensure folio exists for this reservation
  let folioId: string | undefined;
  const { data: existingFolio } = await supabase
    .from("folios")
    .select("id")
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (existingFolio) {
    folioId = existingFolio.id;
  } else {
    const { data: newFolio } = await supabase
      .from("folios")
      .insert({ reservation_id: reservationId, status: "open", currency_code: paymentCurrency || "USD" })
      .select("id")
      .single();
    folioId = newFolio?.id;
  }

  // Post early check-in fee if opted in
  if (postEarlyFee && folioId) {
    const settingsRes = await supabase
      .from("property_settings")
      .select("early_checkin_fee_minor")
      .eq("property_id", activePropertyId)
      .maybeSingle();
    const feeMinor = (settingsRes.data?.early_checkin_fee_minor as number) ?? 0;
    if (feeMinor > 0) {
      await supabase.from("folio_charges").insert({
        folio_id: folioId,
        amount_minor: feeMinor,
        category: "early_checkin",
        description: "Early check-in fee",
      });
    }
  }

  let paymentSetupUrl: string | undefined;
  if (setupAmountMinor > 0 && paymentEmail) {
    const setup = await initializePayment({
      amountMinor: setupAmountMinor,
      currency: paymentCurrency,
      email: paymentEmail,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/front-desk`,
      reference: `checkin-${reservationId}-${Date.now()}`,
    });
    paymentSetupUrl = setup.authorizationUrl;
  }

  revalidatePath("/dashboard/front-desk");
  revalidatePath(`/dashboard/front-desk/check-in/${reservationId}`);
  return { success: true, paymentSetupUrl, folioId };
}

export async function getCheckOutReservationContext(reservationId: string) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, property_id, status, check_in, check_out, guests(first_name,last_name), reservation_rooms(room_id, rooms(room_number))",
    )
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .single();

  if (!reservation) return { reservation: null, folio: null, charges: [], payments: [] };

  let { data: folio } = await supabase
    .from("folios")
    .select("id, status, currency_code")
    .eq("reservation_id", reservationId)
    .maybeSingle();

  if (!folio) {
    const { data: created } = await supabase
      .from("folios")
      .insert({
        reservation_id: reservationId,
        status: "open",
        currency_code: "USD",
      })
      .select("id, status, currency_code")
      .single();
    folio = created;
  }

  const [chargesRes, paymentsRes, settingsPayload] = await Promise.all([
    supabase
      .from("folio_charges")
      .select("id, amount_minor, category, description, created_at")
      .eq("folio_id", folio?.id ?? "")
      .order("created_at", { ascending: true }),
    supabase
      .from("folio_payments")
      .select("id, amount_minor, method, provider, provider_reference, created_at")
      .eq("folio_id", folio?.id ?? "")
      .order("created_at", { ascending: true }),
    getPropertySettingsForCheckout(reservation.property_id),
  ]);

  return {
    reservation,
    folio,
    charges: chargesRes.data ?? [],
    payments: paymentsRes.data ?? [],
    propertySettings: settingsPayload,
  };
}

async function getPropertySettingsForCheckout(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_settings")
    .select("check_out_time, late_checkout_fee_minor")
    .eq("property_id", propertyId)
    .maybeSingle();
  return {
    checkOutTime: data ? (data.check_out_time as string).slice(0, 5) : "11:00",
    lateCheckoutFeeMinor: (data?.late_checkout_fee_minor as number) ?? 0,
  };
}

export async function confirmCheckOut(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = CheckOutSchema.safeParse({
    reservationId: formData.get("reservationId"),
    folioId: formData.get("folioId"),
    paymentMethod: formData.get("paymentMethod"),
    amountMinor: formData.get("amountMinor"),
    currency: formData.get("currency"),
    email: formData.get("email"),
    postLateFee: formData.get("postLateFee") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { reservationId, folioId, paymentMethod, amountMinor, currency, email, postLateFee } = parsed.data;

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, property_id")
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .single();

  if (!reservation) return { error: "Reservation not found for the active property" };

  const { data: scopedFolio } = await supabase
    .from("folios")
    .select("id")
    .eq("id", folioId)
    .eq("reservation_id", reservationId)
    .single();

  if (!scopedFolio) return { error: "Folio not found for this reservation" };

  let provider = "manual";
  let providerReference: string | null = null;

  if (paymentMethod === "card" && amountMinor > 0 && email) {
    const result = await initializePayment({
      amountMinor,
      currency,
      email,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/front-desk/check-out/${reservationId}`,
      reference: `checkout-${reservationId}-${Date.now()}`,
    });
    providerReference = result.reference;
    provider = currency.toUpperCase() === "NGN" ? "paystack" : "stripe";
  }

  await supabase.from("folio_payments").insert({
    folio_id: folioId,
    amount_minor: amountMinor,
    method: paymentMethod,
    provider,
    provider_reference: providerReference,
  });

  await supabase.from("folios").update({ status: "closed" }).eq("id", folioId);

  const { data: rr } = await supabase
    .from("reservation_rooms")
    .select("room_id")
    .eq("reservation_id", reservationId)
    .limit(1)
    .maybeSingle();

  if (rr?.room_id) {
    // Set to dirty so housekeeping picks it up immediately
    await supabase.from("rooms").update({ status: "dirty" }).eq("id", rr.room_id);
  }

  // Post late check-out fee if opted in
  if (postLateFee) {
    const lateFeeRes = await supabase
      .from("property_settings")
      .select("late_checkout_fee_minor")
      .eq("property_id", activePropertyId)
      .maybeSingle();
    const feeMinor = (lateFeeRes.data?.late_checkout_fee_minor as number) ?? 0;
    if (feeMinor > 0) {
      await supabase.from("folio_charges").insert({
        folio_id: folioId,
        amount_minor: feeMinor,
        category: "late_checkout",
        description: "Late check-out fee",
      });
    }
  }

  await supabase.from("check_in_records").update({ checked_out_at: new Date().toISOString() }).eq("reservation_id", reservationId);

  await supabase
    .from("reservations")
    .update({ status: "checked_out", updated_at: new Date().toISOString() })
    .eq("id", reservationId);

  revalidatePath("/dashboard/front-desk");
  revalidatePath(`/dashboard/front-desk/check-out/${reservationId}`);
  return { success: true, providerReference };
}

export async function moveRoom(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = RoomMoveSchema.safeParse({
    reservationId: formData.get("reservationId"),
    toRoomId: formData.get("toRoomId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { reservationId, toRoomId } = parsed.data;

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, property_id")
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .single();

  if (!reservation) return { error: "Reservation not found for the active property" };

  const { data: reservationRoom } = await supabase
    .from("reservation_rooms")
    .select("room_id")
    .eq("reservation_id", reservationId)
    .single();

  const fromRoomId = reservationRoom?.room_id;

  const { data: destinationRoom } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", toRoomId)
    .eq("property_id", activePropertyId)
    .single();

  if (!destinationRoom) return { error: "Destination room not found for the active property" };

  await supabase.from("reservation_rooms").update({ room_id: toRoomId }).eq("reservation_id", reservationId);

  if (fromRoomId) await supabase.from("rooms").update({ status: "vacant" }).eq("id", fromRoomId);
  await supabase.from("rooms").update({ status: "occupied" }).eq("id", toRoomId);

  await supabase.from("room_moves").insert({
    reservation_id: reservationId,
    from_room_id: fromRoomId,
    to_room_id: toRoomId,
  });

  revalidatePath("/dashboard/front-desk");
  revalidatePath("/dashboard/front-desk/room-move");
  return { success: true };
}

export async function getInHouseReservations(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("id, guests(first_name,last_name), reservation_rooms(room_id, rooms(room_number))")
    .eq("property_id", propertyId)
    .eq("status", "checked_in")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getVacantRooms(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("id, room_number, floor")
    .eq("property_id", propertyId)
    .eq("status", "vacant")
    .order("room_number", { ascending: true });
  return data ?? [];
}
