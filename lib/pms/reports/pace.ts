import { createClient } from "@/lib/supabase/server";
import { addYears, format, parseISO, subYears, eachDayOfInterval } from "date-fns";

export interface PaceDatum {
  arrivalDate: string;
  currentBookings: number;
  priorYearBookings: number;
}

export interface PaceReportResult {
  series: PaceDatum[];
  totalCurrentBookings: number;
  totalPriorYearBookings: number;
  forecastOccupancyPct: number;
  totalRooms: number;
}

export async function getPaceReport(input: {
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<PaceReportResult> {
  const supabase = await createClient();

  const priorYearFrom = format(subYears(parseISO(input.dateFrom), 1), "yyyy-MM-dd");
  const priorYearTo = format(subYears(parseISO(input.dateTo), 1), "yyyy-MM-dd");

  const [roomsRes, currentRes, priorRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("out_of_order","maintenance")'),
    supabase
      .from("reservations")
      .select("check_in")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("cancelled","no_show")')
      .gte("check_in", input.dateFrom)
      .lte("check_in", input.dateTo),
    supabase
      .from("reservations")
      .select("check_in")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("cancelled","no_show")')
      .gte("check_in", priorYearFrom)
      .lte("check_in", priorYearTo),
  ]);

  const totalRooms = (roomsRes.data ?? []).length;

  // Count current bookings per arrival date
  const currentCounts = new Map<string, number>();
  for (const r of currentRes.data ?? []) {
    currentCounts.set(r.check_in, (currentCounts.get(r.check_in) ?? 0) + 1);
  }

  // Count prior-year bookings and shift dates +1 year for comparison
  const priorCounts = new Map<string, number>();
  for (const r of priorRes.data ?? []) {
    const shiftedDate = format(addYears(parseISO(r.check_in), 1), "yyyy-MM-dd");
    priorCounts.set(shiftedDate, (priorCounts.get(shiftedDate) ?? 0) + 1);
  }

  const days = eachDayOfInterval({ start: parseISO(input.dateFrom), end: parseISO(input.dateTo) });

  const series: PaceDatum[] = days.map((d) => {
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      arrivalDate: dateStr,
      currentBookings: currentCounts.get(dateStr) ?? 0,
      priorYearBookings: priorCounts.get(dateStr) ?? 0,
    };
  });

  const totalCurrentBookings = series.reduce((s, d) => s + d.currentBookings, 0);
  const totalPriorYearBookings = series.reduce((s, d) => s + d.priorYearBookings, 0);

  const dayCount = days.length;
  const totalAvailableRoomNights = totalRooms * dayCount;
  const forecastOccupancyPct =
    totalAvailableRoomNights > 0
      ? Math.round((totalCurrentBookings / totalAvailableRoomNights) * 1000) / 10
      : 0;

  return {
    series,
    totalCurrentBookings,
    totalPriorYearBookings,
    forecastOccupancyPct,
    totalRooms,
  };
}
