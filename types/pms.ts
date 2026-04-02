export type RoomStatus =
  | "vacant"
  | "occupied"
  | "dirty"
  | "inspection"
  | "maintenance"
  | "out_of_order";

export type ReservationStatus =
  | "tentative"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export interface DateRangeInput {
  checkIn: string;
  checkOut: string;
}

export interface NightlyRateBreakdown {
  date: string;
  amountMinor: number;
  currency: string;
}

export interface ReservationWithRooms {
  reservationId: string;
  guestId: string;
  propertyId: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  roomIds: string[];
}
