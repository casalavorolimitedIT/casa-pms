"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function preCheckInReservation(reservationId: string) {
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
  const supabase = await createClient();

  await supabase
    .from("reservations")
    .update({ status: "no_show", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .in("status", ["tentative", "confirmed"]);

  revalidatePath("/dashboard/arrivals-departures");
  revalidatePath("/dashboard/front-desk");
}
