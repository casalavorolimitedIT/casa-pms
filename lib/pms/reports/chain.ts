import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";

export interface ChainReportRow {
  propertyId: string;
  propertyName: string;
  reservations: number;
  roomNightsSold: number;
  roomNightsAvailable: number;
  occupancyPct: number;
  revenueMinor: number;
}

export async function getChainComparisonReport(input: {
  organizationId: string;
  dateFrom: string;
  dateTo: string;
  propertyIds?: string[];
}) {
  const supabase = await createClient();

  let propertiesQuery = supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", input.organizationId)
    .order("name", { ascending: true });

  if (Array.isArray(input.propertyIds)) {
    if (input.propertyIds.length === 0) {
      return { rows: [] as ChainReportRow[] };
    }
    propertiesQuery = propertiesQuery.in("id", input.propertyIds);
  }

  const { data: properties } = await propertiesQuery;

  const propertyIds = (properties ?? []).map((property) => property.id);
  if (propertyIds.length === 0) return { rows: [] as ChainReportRow[] };

  const [roomsRes, reservationsRes, chargesRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, property_id")
      .in("property_id", propertyIds)
      .not("status", "in", '("out_of_order","maintenance")'),
    supabase
      .from("reservations")
      .select("id, property_id, check_in, check_out, status")
      .in("property_id", propertyIds)
      .not("status", "in", '("cancelled","no_show")')
      .lt("check_in", input.dateTo)
      .gt("check_out", input.dateFrom),
    supabase
      .from("folio_charges")
      .select("amount_minor, folios!inner(reservations!inner(property_id), created_at)")
      .gte("folios.created_at", `${input.dateFrom}T00:00:00.000Z`)
      .lte("folios.created_at", `${input.dateTo}T23:59:59.999Z`),
  ]);

  const daySpan = Math.max(1, differenceInCalendarDays(new Date(input.dateTo), new Date(input.dateFrom)));

  const roomCountByProperty = (roomsRes.data ?? []).reduce<Record<string, number>>((acc, room) => {
    acc[room.property_id] = (acc[room.property_id] ?? 0) + 1;
    return acc;
  }, {});

  const reservationsByProperty = (reservationsRes.data ?? []).reduce<Record<string, number>>((acc, reservation) => {
    acc[reservation.property_id] = (acc[reservation.property_id] ?? 0) + 1;
    return acc;
  }, {});

  const roomNightsSoldByProperty = (reservationsRes.data ?? []).reduce<Record<string, number>>((acc, reservation) => {
    const start = reservation.check_in > input.dateFrom ? reservation.check_in : input.dateFrom;
    const end = reservation.check_out < input.dateTo ? reservation.check_out : input.dateTo;
    const nights = Math.max(0, differenceInCalendarDays(new Date(end), new Date(start)));
    acc[reservation.property_id] = (acc[reservation.property_id] ?? 0) + nights;
    return acc;
  }, {});

  const revenueByProperty = (chargesRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
    const folioRaw = row.folios as
      | { reservations?: { property_id?: string } | Array<{ property_id?: string }> | null }
      | Array<{ reservations?: { property_id?: string } | Array<{ property_id?: string }> | null }>
      | null;
    const folio = Array.isArray(folioRaw) ? folioRaw[0] : folioRaw;
    const reservationRaw = folio?.reservations;
    const reservation = Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw;
    const propertyId = reservation?.property_id;
    if (!propertyId) return acc;
    acc[propertyId] = (acc[propertyId] ?? 0) + row.amount_minor;
    return acc;
  }, {});

  const rows: ChainReportRow[] = (properties ?? []).map((property) => {
    const roomCount = roomCountByProperty[property.id] ?? 0;
    const roomNightsAvailable = roomCount * daySpan;
    const roomNightsSold = roomNightsSoldByProperty[property.id] ?? 0;
    const occupancyPct = roomNightsAvailable > 0 ? (roomNightsSold / roomNightsAvailable) * 100 : 0;

    return {
      propertyId: property.id,
      propertyName: property.name,
      reservations: reservationsByProperty[property.id] ?? 0,
      roomNightsSold,
      roomNightsAvailable,
      occupancyPct,
      revenueMinor: revenueByProperty[property.id] ?? 0,
    };
  });

  return { rows };
}
