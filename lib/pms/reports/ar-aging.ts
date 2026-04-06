import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays } from "date-fns";

export type AgingBucket = "current" | "31-60" | "61-90" | "90+";

export interface ArAgingRow {
  folioId: string;
  reservationId: string;
  guestName: string;
  chargesMinor: number;
  paymentsMinor: number;
  balanceMinor: number;
  ageDays: number;
  bucket: AgingBucket;
  currency: string;
  folioCreatedAt: string;
}

export interface ArAgingResult {
  rows: ArAgingRow[];
  bucketTotals: Record<AgingBucket, number>;
  grandTotalMinor: number;
  currencyCode: string;
}

function ageBucket(days: number): AgingBucket {
  if (days <= 30) return "current";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export async function getArAgingReport(input: { propertyId: string }): Promise<ArAgingResult> {
  const supabase = await createClient();

  const [propertyRes, reservationsRes] = await Promise.all([
    supabase.from("properties").select("currency_code").eq("id", input.propertyId).maybeSingle(),
    supabase
      .from("reservations")
      .select("id, guests(first_name, last_name)")
      .eq("property_id", input.propertyId)
      .not("status", "in", '("cancelled","no_show")'),
  ]);

  const reservations = reservationsRes.data ?? [];
  const reservationIds = reservations.map((r) => r.id);

  if (reservationIds.length === 0) {
    return {
      rows: [],
      bucketTotals: { current: 0, "31-60": 0, "61-90": 0, "90+": 0 },
      grandTotalMinor: 0,
      currencyCode: propertyRes.data?.currency_code ?? "USD",
    };
  }

  const [foliosRes] = await Promise.all([
    supabase
      .from("folios")
      .select("id, reservation_id, currency_code, created_at")
      .in("reservation_id", reservationIds),
  ]);

  const folios = foliosRes.data ?? [];
  const folioIds = folios.map((f) => f.id);

  if (folioIds.length === 0) {
    return {
      rows: [],
      bucketTotals: { current: 0, "31-60": 0, "61-90": 0, "90+": 0 },
      grandTotalMinor: 0,
      currencyCode: propertyRes.data?.currency_code ?? "USD",
    };
  }

  const [chargesRes, paymentsRes] = await Promise.all([
    supabase.from("folio_charges").select("folio_id, amount_minor").in("folio_id", folioIds),
    supabase.from("folio_payments").select("folio_id, amount_minor").in("folio_id", folioIds),
  ]);

  // Build maps
  const chargesByFolio = new Map<string, number>();
  for (const c of chargesRes.data ?? []) {
    chargesByFolio.set(c.folio_id, (chargesByFolio.get(c.folio_id) ?? 0) + c.amount_minor);
  }
  const paymentsByFolio = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    paymentsByFolio.set(p.folio_id, (paymentsByFolio.get(p.folio_id) ?? 0) + p.amount_minor);
  }
  const reservationMap = new Map(reservations.map((r) => [r.id, r]));

  const now = new Date();
  const rows: ArAgingRow[] = [];
  const bucketTotals: Record<AgingBucket, number> = { current: 0, "31-60": 0, "61-90": 0, "90+": 0 };
  let grandTotalMinor = 0;

  for (const folio of folios) {
    const chargesMinor = chargesByFolio.get(folio.id) ?? 0;
    const paymentsMinor = paymentsByFolio.get(folio.id) ?? 0;
    const balanceMinor = chargesMinor - paymentsMinor;

    if (balanceMinor <= 0) continue; // only outstanding

    const reservation = reservationMap.get(folio.reservation_id);
    const guestRaw = reservation?.guests as
      | { first_name?: string; last_name?: string }
      | Array<{ first_name?: string; last_name?: string }>
      | null;
    const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    const guestName = `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown";

    const ageDays = differenceInCalendarDays(now, new Date(folio.created_at));
    const bucket = ageBucket(ageDays);

    bucketTotals[bucket] += balanceMinor;
    grandTotalMinor += balanceMinor;

    rows.push({
      folioId: folio.id,
      reservationId: folio.reservation_id,
      guestName,
      chargesMinor,
      paymentsMinor,
      balanceMinor,
      ageDays,
      bucket,
      currency: folio.currency_code,
      folioCreatedAt: folio.created_at,
    });
  }

  rows.sort((a, b) => b.ageDays - a.ageDays);

  return {
    rows,
    bucketTotals,
    grandTotalMinor,
    currencyCode: propertyRes.data?.currency_code ?? "USD",
  };
}
