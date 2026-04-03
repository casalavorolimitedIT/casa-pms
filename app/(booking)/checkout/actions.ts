"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateRate } from "@/lib/pms/rates";
import { initializePayment } from "@/lib/payments/provider";
import { resolvePaymentGateway } from "@/lib/payments/gateway-router";

const StartCheckoutSchema = z.object({
  propertyId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  adults: z.coerce.number().int().min(1).max(20).default(1),
  children: z.coerce.number().int().min(0).max(20).default(0),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  currencyCode: z.string().min(3).max(3),
});

function buildReference(propertyId: string) {
  const shortProperty = propertyId.slice(0, 8);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${shortProperty}-${ts}-${rand}`;
}

export async function startCheckout(formData: FormData) {
  const parsed = StartCheckoutSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomTypeId: formData.get("roomTypeId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    currencyCode: formData.get("currencyCode"),
  });

  if (!parsed.success) {
    redirect(`/checkout?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid checkout request")}`);
  }

  const data = parsed.data;

  const rate = await calculateRate({
    propertyId: data.propertyId,
    roomTypeId: data.roomTypeId,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    currency: data.currencyCode,
  });

  const paymentReference = buildReference(data.propertyId);
  const paymentGateway = resolvePaymentGateway({ currency: data.currencyCode });

  const admin = createAdminClient();

  const { data: intent, error: intentError } = await admin
    .from("booking_intents")
    .insert({
      property_id: data.propertyId,
      guest_email: data.email,
      guest_first_name: data.firstName,
      guest_last_name: data.lastName,
      check_in: data.checkIn,
      check_out: data.checkOut,
      room_type_id: data.roomTypeId,
      adults: data.adults,
      children: data.children,
      currency_code: data.currencyCode.toUpperCase(),
      total_rate_minor: rate.totalMinor,
      payment_reference: paymentReference,
      payment_gateway: paymentGateway,
      payment_status: "initialized",
    })
    .select("id")
    .single();

  if (intentError) {
    redirect(`/checkout?error=${encodeURIComponent(intentError.message)}`);
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/confirm?intentId=${intent.id}&reference=${paymentReference}&currency=${data.currencyCode}`;

  const payment = await initializePayment({
    amountMinor: rate.totalMinor,
    currency: data.currencyCode,
    email: data.email,
    callbackUrl,
    reference: paymentReference,
  });

  redirect(payment.authorizationUrl);
}
