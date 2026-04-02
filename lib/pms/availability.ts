import { createClient } from "@/lib/supabase/server";
import { DateRangeInput } from "@/types/pms";

export interface AvailabilityQueryInput extends DateRangeInput {
  propertyId: string;
}

export interface RoomTypeAvailability {
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;
  bookedRooms: number;
  availableCount: number;
  baseRateMinor: number;
}

/**
 * Returns availability per room type for a date range.
 *
 * Algorithm:
 *  1. Fetch all room types for the property.
 *  2. Fetch total room count per type (excluding out_of_order / maintenance).
 *  3. Fetch count of confirmed/checked_in reservations overlapping the range.
 *  4. availableCount = total - booked.
 *
 * Replaced the M00 scaffold with a real Supabase-backed implementation.
 */
export async function getRoomTypeAvailability(
  input: AvailabilityQueryInput,
): Promise<RoomTypeAvailability[]> {
  const supabase = await createClient();

  // Fetch room types
  const { data: roomTypes, error: rtError } = await supabase
    .from("room_types")
    .select("id, name, base_rate_minor")
    .eq("property_id", input.propertyId);

  if (rtError || !roomTypes) return [];

  // Fetch active room counts per type (exclude out_of_order)
  const { data: roomCounts } = await supabase
    .from("rooms")
    .select("room_type_id")
    .eq("property_id", input.propertyId)
    .not("status", "in", '("out_of_order","maintenance")');

  // Fetch overlapping reservations (not cancelled / no_show)
  const { data: bookedRooms } = await supabase
    .from("reservation_rooms")
    .select(
      `
      room_type_id,
      reservations!inner (status, check_in, check_out)
    `,
    )
    .eq("reservations.property_id", input.propertyId)
    .not("reservations.status", "in", '("cancelled","no_show")')
    .lt("reservations.check_in", input.checkOut)
    .gt("reservations.check_out", input.checkIn);

  // Aggregate counts
  const totalByType = (roomCounts ?? []).reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.room_type_id] = (acc[r.room_type_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const bookedByType = (bookedRooms ?? []).reduce<Record<string, number>>(
    (acc, rr) => {
      acc[rr.room_type_id] = (acc[rr.room_type_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return roomTypes.map((rt) => {
    const total = totalByType[rt.id] ?? 0;
    const booked = bookedByType[rt.id] ?? 0;
    return {
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      totalRooms: total,
      bookedRooms: booked,
      availableCount: Math.max(0, total - booked),
      baseRateMinor: rt.base_rate_minor,
    };
  });
}
