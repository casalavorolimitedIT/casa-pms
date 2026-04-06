import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, eachDayOfInterval, format, parseISO, subDays } from "date-fns";

export interface DailyRevenue {
  date: string;
  totalMinor: number;
  byCategory: Record<string, number>;
}

export interface RevenueReportResult {
  series: DailyRevenue[];
  totalMinor: number;
  priorPeriodTotalMinor: number;
  categories: string[];
  forwardBookedMinor: number;
  currencyCode: string;
}

export async function getRevenueReport(input: {
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<RevenueReportResult> {
  const supabase = await createClient();

  const daySpan = Math.max(
    1,
    differenceInCalendarDays(parseISO(input.dateTo), parseISO(input.dateFrom)) + 1,
  );
  const priorToDate = subDays(parseISO(input.dateFrom), 1);
  const priorFromDate = subDays(priorToDate, daySpan - 1);
  const priorFromStr = format(priorFromDate, "yyyy-MM-dd");
  const priorToStr = format(priorToDate, "yyyy-MM-dd");

  const [propertyRes, reservationIdsRes] = await Promise.all([
    supabase.from("properties").select("currency_code").eq("id", input.propertyId).maybeSingle(),
    supabase.from("reservations").select("id").eq("property_id", input.propertyId),
  ]);

  const reservationIds = (reservationIdsRes.data ?? []).map((r) => r.id);

  if (reservationIds.length === 0) {
    const days = eachDayOfInterval({ start: parseISO(input.dateFrom), end: parseISO(input.dateTo) });
    return {
      series: days.map((d) => ({ date: format(d, "yyyy-MM-dd"), totalMinor: 0, byCategory: {} })),
      totalMinor: 0,
      priorPeriodTotalMinor: 0,
      categories: [],
      forwardBookedMinor: 0,
      currencyCode: propertyRes.data?.currency_code ?? "USD",
    };
  }

  const [folioIdsRes] = await Promise.all([
    supabase.from("folios").select("id").in("reservation_id", reservationIds),
  ]);

  const folioIds = (folioIdsRes.data ?? []).map((f) => f.id);

  const [chargesRes, priorChargesRes, forwardRes] = await Promise.all([
    folioIds.length > 0
      ? supabase
          .from("folio_charges")
          .select("amount_minor, category, created_at")
          .in("folio_id", folioIds)
          .gte("created_at", `${input.dateFrom}T00:00:00.000Z`)
          .lte("created_at", `${input.dateTo}T23:59:59.999Z`)
      : Promise.resolve({ data: [] }),
    folioIds.length > 0
      ? supabase
          .from("folio_charges")
          .select("amount_minor")
          .in("folio_id", folioIds)
          .gte("created_at", `${priorFromStr}T00:00:00.000Z`)
          .lte("created_at", `${priorToStr}T23:59:59.999Z`)
      : Promise.resolve({ data: [] }),
    supabase
      .from("reservations")
      .select("total_rate_minor")
      .eq("property_id", input.propertyId)
      .gt("check_in", input.dateTo)
      .not("status", "in", '("cancelled","no_show")'),
  ]);

  const days = eachDayOfInterval({ start: parseISO(input.dateFrom), end: parseISO(input.dateTo) });
  const seriesMap = new Map<string, DailyRevenue>(
    days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return [key, { date: key, totalMinor: 0, byCategory: {} }];
    }),
  );

  const categories = new Set<string>();
  let totalMinor = 0;

  for (const row of chargesRes.data ?? []) {
    const date = format(parseISO(row.created_at as string), "yyyy-MM-dd");
    const entry = seriesMap.get(date);
    if (!entry) continue;
    const cat = (row.category as string) ?? "other";
    entry.totalMinor += row.amount_minor as number;
    entry.byCategory[cat] = (entry.byCategory[cat] ?? 0) + (row.amount_minor as number);
    categories.add(cat);
    totalMinor += row.amount_minor as number;
  }

  const priorPeriodTotalMinor = (priorChargesRes.data ?? []).reduce(
    (sum, r) => sum + (r.amount_minor as number),
    0,
  );

  const forwardBookedMinor = (forwardRes.data ?? []).reduce(
    (sum, r) => sum + (r.total_rate_minor ?? 0),
    0,
  );

  return {
    series: Array.from(seriesMap.values()),
    totalMinor,
    priorPeriodTotalMinor,
    categories: Array.from(categories).sort(),
    forwardBookedMinor,
    currencyCode: propertyRes.data?.currency_code ?? "USD",
  };
}
