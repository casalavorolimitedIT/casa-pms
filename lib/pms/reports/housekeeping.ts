import { createClient } from "@/lib/supabase/server";


export interface HkAttendantRow {
  attendantId: string | null;
  attendantName: string;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export interface HkReportResult {
  rows: HkAttendantRow[];
  totalCompleted: number;
  totalPending: number;
  dateFrom: string;
  dateTo: string;
}

export async function getHousekeepingReport(input: {
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<HkReportResult> {
  const supabase = await createClient();

  const assignmentsRes = await supabase
    .from("housekeeping_assignments")
    .select("id, attendant_user_id, status, created_at")
    .eq("property_id", input.propertyId)
    .gte("created_at", `${input.dateFrom}T00:00:00.000Z`)
    .lte("created_at", `${input.dateTo}T23:59:59.999Z`);

  const assignments = assignmentsRes.data ?? [];

  const attendantIds = [...new Set(assignments.map((a) => a.attendant_user_id).filter(Boolean))] as string[];

  // Fetch attendant names from profiles
  const profilesMap = new Map<string, string>();
  if (attendantIds.length > 0) {
    const profilesRes = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", attendantIds);
    for (const p of profilesRes.data ?? []) {
      profilesMap.set(p.id, p.full_name || p.email || p.id);
    }
  }

  // Aggregate by attendant
  const map = new Map<string | null, HkAttendantRow>();

  for (const a of assignments) {
    const key = a.attendant_user_id ?? null;
    const existing = map.get(key);
    const name =
      key !== null ? (profilesMap.get(key) ?? "Unknown Attendant") : "Unassigned";

    if (!existing) {
      map.set(key, {
        attendantId: key,
        attendantName: name,
        completed: a.status === "completed" ? 1 : 0,
        inProgress: a.status === "in_progress" ? 1 : 0,
        pending: a.status === "pending" ? 1 : 0,
        total: 1,
      });
    } else {
      existing.completed += a.status === "completed" ? 1 : 0;
      existing.inProgress += a.status === "in_progress" ? 1 : 0;
      existing.pending += a.status === "pending" ? 1 : 0;
      existing.total += 1;
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.completed - a.completed);
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);

  return {
    rows,
    totalCompleted,
    totalPending,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}
