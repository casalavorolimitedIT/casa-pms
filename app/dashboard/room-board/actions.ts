"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const ReassignSchema = z.object({
  reservationId: z.string().uuid(),
  toRoomId: z.string().uuid(),
});

export async function getRoomBoardSnapshot(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [roomsRes, reservationsRes, dndRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, floor, status, room_types(name)")
      .eq("property_id", propertyId)
      .order("floor", { ascending: true, nullsFirst: true })
      .order("room_number", { ascending: true }),
    supabase
      .from("reservations")
      .select(
        "id, status, check_in, check_out, guests(first_name,last_name), reservation_rooms(room_id, room_type_id, rate_per_night_minor, rooms(id, room_number))",
      )
      .eq("property_id", propertyId)
      .in("status", ["tentative", "confirmed", "checked_in"])
      .order("check_in", { ascending: true }),
    supabase
      .from("room_dnd_logs")
      .select("room_id")
      .eq("property_id", propertyId)
      .eq("is_dnd", true)
      .is("ends_at", null),
  ]);

  const rooms = roomsRes.data ?? [];
  const reservations = (reservationsRes.data ?? [])
    .map((reservation) => {
      const assignment = Array.isArray(reservation.reservation_rooms)
        ? reservation.reservation_rooms[0] ?? null
        : reservation.reservation_rooms;

      if (!assignment?.room_id) return null;

      const guest = Array.isArray(reservation.guests)
        ? reservation.guests[0] ?? null
        : reservation.guests;

      return {
        id: reservation.id,
        status: reservation.status,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        roomId: assignment.room_id,
        roomNumber: assignment.rooms?.[0]?.room_number ?? null,
        guestName: `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    rooms,
    reservations,
    activeDndRoomIds: (dndRes.data ?? []).map((row) => row.room_id),
  };
}

export async function reassignReservationRoom(input: { reservationId: string; toRoomId: string }) {
  const parsed = ReassignSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { reservationId, toRoomId } = parsed.data;
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!reservation) {
    return { error: "Reservation not found for the active property" };
  }

  const { data: targetRoom } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", toRoomId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!targetRoom) {
    return { error: "Destination room not found for the active property" };
  }

  const { data: reservationRoom, error: reservationRoomError } = await supabase
    .from("reservation_rooms")
    .select("room_id")
    .eq("reservation_id", reservationId)
    .single();

  if (reservationRoomError) {
    return { error: reservationRoomError.message };
  }

  const fromRoomId = reservationRoom?.room_id;
  if (fromRoomId === toRoomId) {
    return { success: true };
  }

  const { error: updateError } = await supabase
    .from("reservation_rooms")
    .update({ room_id: toRoomId })
    .eq("reservation_id", reservationId);

  if (updateError) {
    return { error: updateError.message };
  }

  if (fromRoomId) {
    await supabase.from("rooms").update({ status: "vacant" }).eq("id", fromRoomId);
  }

  await supabase.from("rooms").update({ status: "occupied" }).eq("id", toRoomId);

  await supabase.from("room_moves").insert({
    reservation_id: reservationId,
    from_room_id: fromRoomId,
    to_room_id: toRoomId,
  });

  revalidatePath("/dashboard/room-board");
  revalidatePath("/dashboard/front-desk");

  return { success: true };
}
