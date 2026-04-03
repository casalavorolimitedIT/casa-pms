"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  generateAuditReport,
  postRoomCharges,
  runNightAudit,
  runNoShowLogic,
} from "@/lib/pms/audit";

export async function runNightAuditAction(input: { propertyId: string; businessDate: string }) {
  const summary = await runNightAudit(input.propertyId, input.businessDate);
  revalidatePath("/dashboard/night-audit");
  return summary;
}

export async function postRoomChargesAction(input: { propertyId: string; businessDate: string }) {
  const postedRoomChargesMinor = await postRoomCharges(input.propertyId, input.businessDate);
  revalidatePath("/dashboard/night-audit");
  return { postedRoomChargesMinor };
}

export async function runNoShowLogicAction(input: { propertyId: string; businessDate: string }) {
  const noShowMarkedCount = await runNoShowLogic(input.propertyId, input.businessDate);
  revalidatePath("/dashboard/night-audit");
  return { noShowMarkedCount };
}

export async function generateAuditReportAction(input: { propertyId: string; businessDate: string }) {
  return generateAuditReport(input.propertyId, input.businessDate);
}

export async function getNightAuditHistory(propertyId: string) {
  const supabase = await createClient();

  const [{ data: runs }, { data: snapshots }] = await Promise.all([
    supabase
      .from("audit_runs")
      .select("id, business_date, status, created_at")
      .eq("property_id", propertyId)
      .order("business_date", { ascending: false })
      .limit(10),
    supabase
      .from("daily_revenue_snapshots")
      .select("business_date, room_revenue_minor, non_room_revenue_minor, created_at")
      .eq("property_id", propertyId)
      .order("business_date", { ascending: false })
      .limit(10),
  ]);

  return {
    runs: runs ?? [],
    snapshots: snapshots ?? [],
  };
}
