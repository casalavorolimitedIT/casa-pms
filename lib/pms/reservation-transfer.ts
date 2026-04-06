import { createClient } from "@/lib/supabase/server";

export interface TransferReservationInput {
  sourceReservationId: string;
  targetPropertyId: string;
  targetRoomTypeId: string;
  checkIn: string;
  checkOut: string;
  notes?: string;
}

export async function transferReservationAcrossProperties(input: TransferReservationInput) {
  const supabase = await createClient();

  const { data: sourceReservation, error: sourceError } = await supabase
    .from("reservations")
    .select("id, property_id, guest_id, adults, children, source, notes")
    .eq("id", input.sourceReservationId)
    .maybeSingle();

  if (sourceError) return { error: sourceError.message };
  if (!sourceReservation) return { error: "Source reservation not found" };

  const { data: created, error: createError } = await supabase
    .from("reservations")
    .insert({
      property_id: input.targetPropertyId,
      guest_id: sourceReservation.guest_id,
      status: "confirmed",
      check_in: input.checkIn,
      check_out: input.checkOut,
      adults: sourceReservation.adults,
      children: sourceReservation.children,
      source: sourceReservation.source,
      notes: input.notes || `Transferred from ${sourceReservation.id}`,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return { error: createError?.message ?? "Unable to create target reservation" };
  }

  const { error: rrError } = await supabase.from("reservation_rooms").insert({
    reservation_id: created.id,
    room_type_id: input.targetRoomTypeId,
    room_id: null,
  });

  if (rrError) return { error: rrError.message };

  const transferNote = `${sourceReservation.notes ?? ""}\n[Transferred to ${created.id} @ ${new Date().toISOString()}]`.trim();

  const { error: cancelError } = await supabase
    .from("reservations")
    .update({ status: "cancelled", notes: transferNote })
    .eq("id", sourceReservation.id);

  if (cancelError) return { error: cancelError.message };

  return { success: true, targetReservationId: created.id };
}
