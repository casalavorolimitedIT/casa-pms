import { ChannelInboundBooking } from "./booking-com";

export function mapAirbnbPayload(payload: unknown): ChannelInboundBooking | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const externalBookingId = String(p.confirmation_code ?? "").trim();
  const guestFirstName = String(p.guest_first_name ?? "").trim();
  const guestLastName = String(p.guest_last_name ?? "").trim();
  const guestEmail = String(p.guest_email ?? "").trim();
  const checkIn = String(p.start_date ?? "").trim();
  const checkOut = String(p.end_date ?? "").trim();
  const roomTypeId = String(p.room_type_id ?? "").trim();
  const totalRateMinor = Number(p.price_total_minor ?? 0);

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
