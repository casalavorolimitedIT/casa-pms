import { createClient } from "@/lib/supabase/server";

export interface SegmentDatum {
  source: string;
  reservations: number;
  revenueMinor: number;
  sharePct: number;
}

export interface SegmentationReportResult {
  segments: SegmentDatum[];
  totalReservations: number;
  totalRevenueMinor: number;
  currencyCode: string;
}

export async function getSegmentationReport(input: {
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<SegmentationReportResult> {
  const supabase = await createClient();

  const [propertyRes, reservationsRes] = await Promise.all([
    supabase.from("properties").select("currency_code").eq("id", input.propertyId).maybeSingle(),
    supabase
      .from("reservations")
      .select("id, source, total_rate_minor, created_at")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("cancelled","no_show")')
      .gte("check_in", input.dateFrom)
      .lte("check_in", input.dateTo),
  ]);

  const reservations = reservationsRes.data ?? [];

  // Aggregate by source
  const map = new Map<string, { reservations: number; revenueMinor: number }>();
  let totalReservations = 0;
  let totalRevenueMinor = 0;

  for (const r of reservations) {
    const source = (r.source as string | null) || "direct";
    const existing = map.get(source);
    const revenue = r.total_rate_minor ?? 0;

    if (!existing) {
      map.set(source, { reservations: 1, revenueMinor: revenue });
    } else {
      existing.reservations += 1;
      existing.revenueMinor += revenue;
    }

    totalReservations += 1;
    totalRevenueMinor += revenue;
  }

  const segments: SegmentDatum[] = Array.from(map.entries())
    .map(([source, data]) => ({
      source,
      reservations: data.reservations,
      revenueMinor: data.revenueMinor,
      sharePct:
        totalReservations > 0
          ? Math.round((data.reservations / totalReservations) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.revenueMinor - a.revenueMinor);

  return {
    segments,
    totalReservations,
    totalRevenueMinor,
    currencyCode: propertyRes.data?.currency_code ?? "USD",
  };
}
