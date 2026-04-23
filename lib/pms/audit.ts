import { createClient } from "@/lib/supabase/server";

export interface NightAuditSummary {
  businessDate: string;
  postedRoomChargesMinor: number;
  noShowMarkedCount: number;
  discrepanciesCount: number;
  roomRevenueMinor: number;
  nonRoomRevenueMinor: number;
}

export async function postRoomCharges(propertyId: string, businessDate: string) {
  const supabase = await createClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, check_in, check_out, status, total_rate_minor, reservation_rooms(rate_per_night_minor, room_type_id, room_id)")
    .eq("property_id", propertyId)
    .eq("status", "checked_in")
    .lte("check_in", businessDate)
    .gt("check_out", businessDate);

  const { data: propertyData } = await supabase
    .from("properties")
    .select("currency_code")
    .eq("id", propertyId)
    .maybeSingle();
  const propertyCurrencyCode = propertyData?.currency_code ?? "USD";

  let postedTotalMinor = 0;

  for (const reservation of reservations ?? []) {
    const assignment = Array.isArray(reservation.reservation_rooms)
      ? reservation.reservation_rooms[0] ?? null
      : reservation.reservation_rooms;

    if (!assignment?.room_id) continue;

    const amountMinor = assignment.rate_per_night_minor ?? reservation.total_rate_minor ?? 0;
    if (amountMinor <= 0) continue;

    let { data: folio } = await supabase
      .from("folios")
      .select("id")
      .eq("reservation_id", reservation.id)
      .eq("status", "open")
      .maybeSingle();

    if (!folio) {
      const { data: createdFolio } = await supabase
        .from("folios")
        .insert({ reservation_id: reservation.id, status: "open", currency_code: propertyCurrencyCode })
        .select("id")
        .single();
      folio = createdFolio;
    }

    if (!folio) continue;

    const chargeDescription = `Room charge ${businessDate}`;

    const { data: existingCharge } = await supabase
      .from("folio_charges")
      .select("id")
      .eq("folio_id", folio.id)
      .eq("category", "room_revenue")
      .eq("description", chargeDescription)
      .maybeSingle();

    if (existingCharge) continue;

    const { error } = await supabase.from("folio_charges").insert({
      folio_id: folio.id,
      amount_minor: amountMinor,
      category: "room_revenue",
      description: chargeDescription,
    });

    if (!error) {
      postedTotalMinor += amountMinor;
    }
  }

  return postedTotalMinor;
}

export async function runNoShowLogic(propertyId: string, businessDate: string) {
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("reservations")
    .select("id")
    .eq("property_id", propertyId)
    .lt("check_in", businessDate)
    .in("status", ["tentative", "confirmed"]);

  if (!candidates?.length) return 0;

  const ids = candidates.map((item) => item.id);
  const { error } = await supabase
    .from("reservations")
    .update({ status: "no_show", updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) return 0;
  return ids.length;
}

export async function generateAuditReport(propertyId: string, businessDate: string) {
  const supabase = await createClient();

  const [{ data: charges }, { data: payments }, { data: inHouseWithoutRoom }] = await Promise.all([
    supabase
      .from("folio_charges")
      .select("amount_minor, category, folios!inner(reservation_id, reservations!inner(property_id))")
      .eq("folios.reservations.property_id", propertyId)
      .gte("created_at", `${businessDate}T00:00:00.000Z`)
      .lt("created_at", `${businessDate}T23:59:59.999Z`),
    supabase
      .from("folio_payments")
      .select("amount_minor, folios!inner(reservation_id, reservations!inner(property_id))")
      .eq("folios.reservations.property_id", propertyId)
      .gte("created_at", `${businessDate}T00:00:00.000Z`)
      .lt("created_at", `${businessDate}T23:59:59.999Z`),
    supabase
      .from("reservations")
      .select("id, reservation_rooms(room_id)")
      .eq("property_id", propertyId)
      .eq("status", "checked_in"),
  ]);

  let roomRevenueMinor = 0;
  let nonRoomRevenueMinor = 0;

  for (const charge of charges ?? []) {
    if (charge.category === "room_revenue") {
      roomRevenueMinor += charge.amount_minor;
    } else {
      nonRoomRevenueMinor += charge.amount_minor;
    }
  }

  const paymentTotalMinor = (payments ?? []).reduce((sum, payment) => sum + payment.amount_minor, 0);

  const unresolvedRoomAssignments = (inHouseWithoutRoom ?? []).filter((reservation) => {
    const assignment = Array.isArray(reservation.reservation_rooms)
      ? reservation.reservation_rooms[0] ?? null
      : reservation.reservation_rooms;
    return !assignment?.room_id;
  }).length;

  const negativeNetRevenue = roomRevenueMinor + nonRoomRevenueMinor - paymentTotalMinor < 0 ? 1 : 0;

  return {
    roomRevenueMinor,
    nonRoomRevenueMinor,
    discrepanciesCount: unresolvedRoomAssignments + negativeNetRevenue,
  };
}

export async function runNightAudit(propertyId: string, businessDate: string): Promise<NightAuditSummary> {
  const supabase = await createClient();

  await supabase
    .from("audit_runs")
    .upsert(
      {
        property_id: propertyId,
        business_date: businessDate,
        status: "running",
      },
      { onConflict: "property_id,business_date" },
    );

  const postedRoomChargesMinor = await postRoomCharges(propertyId, businessDate);
  const noShowMarkedCount = await runNoShowLogic(propertyId, businessDate);
  const report = await generateAuditReport(propertyId, businessDate);

  await supabase
    .from("daily_revenue_snapshots")
    .upsert(
      {
        property_id: propertyId,
        business_date: businessDate,
        room_revenue_minor: report.roomRevenueMinor,
        non_room_revenue_minor: report.nonRoomRevenueMinor,
      },
      { onConflict: "property_id,business_date" },
    );

  await supabase
    .from("audit_runs")
    .update({ status: "completed" })
    .eq("property_id", propertyId)
    .eq("business_date", businessDate);

  return {
    businessDate,
    postedRoomChargesMinor,
    noShowMarkedCount,
    discrepanciesCount: report.discrepanciesCount,
    roomRevenueMinor: report.roomRevenueMinor,
    nonRoomRevenueMinor: report.nonRoomRevenueMinor,
  };
}
