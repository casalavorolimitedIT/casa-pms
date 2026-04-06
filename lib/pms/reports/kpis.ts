import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, eachDayOfInterval, format, parseISO } from "date-fns";

export interface KpiDatum {
  date: string;
  occupancyPct: number;
  adrMinor: number;
  revparMinor: number;
  roomsSold: number;
}

export interface KpiReportResult {
  series: KpiDatum[];
  totalRooms: number;
  avgOccupancyPct: number;
  avgAdrMinor: number;
  avgRevparMinor: number;
  currencyCode: string;
}

export async function getKpiReport(input: {
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<KpiReportResult> {
  const supabase = await createClient();

  const [propertyRes, roomsRes, reservationsRes] = await Promise.all([
    supabase.from("properties").select("currency_code").eq("id", input.propertyId).maybeSingle(),
    supabase
      .from("rooms")
      .select("id")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("out_of_order","maintenance")'),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, total_rate_minor, status")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("cancelled","no_show")')
      .lt("check_in", input.dateTo)
      .gt("check_out", input.dateFrom),
  ]);

  const totalRooms = (roomsRes.data ?? []).length;
  const reservations = reservationsRes.data ?? [];

  const days = eachDayOfInterval({ start: parseISO(input.dateFrom), end: parseISO(input.dateTo) });

  const series: KpiDatum[] = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");

    // Rooms sold = reservations where check_in <= day < check_out
    const staying = reservations.filter(
      (r) => r.check_in <= dayStr && r.check_out > dayStr,
    );

    const roomsSold = staying.length;
    const occupancyPct = totalRooms > 0 ? (roomsSold / totalRooms) * 100 : 0;

    // ADR = total room revenue / rooms sold for the day
    const dayRevenueMinor = staying.reduce((sum, r) => {
      const nights = Math.max(
        1,
        differenceInCalendarDays(parseISO(r.check_out), parseISO(r.check_in)),
      );
      return sum + Math.round((r.total_rate_minor ?? 0) / nights);
    }, 0);

    const adrMinor = roomsSold > 0 ? Math.round(dayRevenueMinor / roomsSold) : 0;
    const revparMinor = totalRooms > 0 ? Math.round(dayRevenueMinor / totalRooms) : 0;

    return { date: dayStr, occupancyPct: Math.round(occupancyPct * 10) / 10, adrMinor, revparMinor, roomsSold };
  });

  const daysWithOccupancy = series.filter((d) => d.roomsSold > 0);
  const avgOccupancyPct =
    series.length > 0
      ? Math.round((series.reduce((s, d) => s + d.occupancyPct, 0) / series.length) * 10) / 10
      : 0;
  const avgAdrMinor =
    daysWithOccupancy.length > 0
      ? Math.round(daysWithOccupancy.reduce((s, d) => s + d.adrMinor, 0) / daysWithOccupancy.length)
      : 0;
  const avgRevparMinor =
    series.length > 0
      ? Math.round(series.reduce((s, d) => s + d.revparMinor, 0) / series.length)
      : 0;

  return {
    series,
    totalRooms,
    avgOccupancyPct,
    avgAdrMinor,
    avgRevparMinor,
    currencyCode: propertyRes.data?.currency_code ?? "USD",
  };
}
