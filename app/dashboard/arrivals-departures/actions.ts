"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActivePropertyId } from "@/lib/pms/property-context";

async function ensureReservationInActiveProperty(reservationId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Reservation not found for the active property");
  }
}

export async function preCheckInReservation(reservationId: string) {
  await ensureReservationInActiveProperty(reservationId);
  const supabase = await createClient();

  await supabase
    .from("reservations")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .in("status", ["tentative", "confirmed"]);

  revalidatePath("/dashboard/arrivals-departures");
  revalidatePath("/dashboard/front-desk");
}

export async function markReservationNoShow(reservationId: string) {
  await ensureReservationInActiveProperty(reservationId);
  const supabase = await createClient();

  await supabase
    .from("reservations")
    .update({ status: "no_show", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .in("status", ["tentative", "confirmed"]);

  revalidatePath("/dashboard/arrivals-departures");
  revalidatePath("/dashboard/front-desk");
}
