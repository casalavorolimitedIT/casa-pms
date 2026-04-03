export type ChannelInboundBooking = {
  externalBookingId: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  roomTypeId: string;
  totalRateMinor: number;
};

export function mapBookingComPayload(payload: unknown): ChannelInboundBooking | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const externalBookingId = String(p.reservation_id ?? "").trim();
  const guestFirstName = String(p.guest_first_name ?? "").trim();
  const guestLastName = String(p.guest_last_name ?? "").trim();
  const guestEmail = String(p.guest_email ?? "").trim();
  const checkIn = String(p.check_in ?? "").trim();
  const checkOut = String(p.check_out ?? "").trim();
  const roomTypeId = String(p.room_type_id ?? "").trim();
  const totalRateMinor = Number(p.total_rate_minor ?? 0);

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
