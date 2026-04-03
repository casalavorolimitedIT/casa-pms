import { ChannelInboundBooking } from "./booking-com";

export function mapExpediaPayload(payload: unknown): ChannelInboundBooking | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const externalBookingId = String(p.booking_id ?? "").trim();
  const guestFirstName = String(p.first_name ?? "").trim();
  const guestLastName = String(p.last_name ?? "").trim();
  const guestEmail = String(p.email ?? "").trim();
  const checkIn = String(p.arrival_date ?? "").trim();
  const checkOut = String(p.departure_date ?? "").trim();
  const roomTypeId = String(p.room_type_id ?? "").trim();
  const totalRateMinor = Number(p.total_minor ?? 0);

  if (!externalBookingId || !guestEmail || !checkIn || !checkOut || !roomTypeId) return null;

  return {
    externalBookingId,
    guestFirstName,
    guestLastName,
    guestEmail,
    checkIn,
    checkOut,
    roomTypeId,
    totalRateMinor: Number.isFinite(totalRateMinor) ? Math.max(0, Math.trunc(totalRateMinor)) : 0,
  };
}
