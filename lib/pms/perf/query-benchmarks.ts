/**
 * lib/pms/perf/query-benchmarks.ts
 *
 * Defines the set of benchmark queries for key hot paths.
 * Each entry pairs a human-readable label with a Supabase call factory so the
 * scripts/benchmarks/run-benchmarks.ts runner can execute and time them uniformly.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface BenchmarkCase {
  label: string;
  run: (client: SupabaseClient) => Promise<void>;
}

/**
 * Returns all benchmark cases.
 * @param propertyId  A real property UUID present in the target database.
 * @param today       ISO date string used as the reference "today" anchor.
 */
export function getBenchmarkCases(propertyId: string, today: string): BenchmarkCase[] {
  const checkOut = addDays(today, 7);
  return [
    {
      label: "availability — room type availability overlap (7-night window)",
      async run(client) {
        const { error } = await client
          .from("reservation_rooms")
          .select("room_type_id")
          .eq("property_id", propertyId)      // intentional: test partial index coverage
          .lt("check_in", checkOut)
          .gt("check_out", today)
          .limit(500);
        if (error) throw new Error(error.message);
      },
    },
    {
      label: "reservations — active reservations for property",
      async run(client) {
        const { error } = await client
          .from("reservations")
          .select("id, check_in, check_out, status")
          .eq("property_id", propertyId)
          .not("status", "in", '("cancelled","no_show")')
          .gte("check_out", today)
          .limit(200);
        if (error) throw new Error(error.message);
      },
    },
    {
      label: "night-audit — checked-in guests due to check out today",
      async run(client) {
        const { error } = await client
          .from("reservations")
          .select("id, check_out")
          .eq("property_id", propertyId)
          .eq("status", "checked_in")
          .eq("check_out", today)
          .limit(200);
        if (error) throw new Error(error.message);
      },
    },
    {
      label: "folio charges — ledger for single folio",
      async run(client) {
        // Fetch the first folio id in scope, then benchmark the ledger load.
        const { data: folios, error: fe } = await client
          .from("folios")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (fe) throw new Error(fe.message);
        if (!folios) return; // no data in env — skip timing
        const { error } = await client
          .from("folio_charges")
          .select("id, amount_minor, description, created_at")
          .eq("folio_id", folios.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw new Error(error.message);
      },
    },
    {
      label: "reporting — revenue charges in 30-day window",
      async run(client) {
        const thirtyDaysAgo = addDays(today, -30);
        const { error } = await client
          .from("folio_charges")
          .select("amount_minor, created_at")
          .gte("created_at", thirtyDaysAgo)
          .lte("created_at", today)
          .limit(2000);
        if (error) throw new Error(error.message);
      },
    },
    {
      label: "housekeeping board — assignments for property today",
      async run(client) {
        const { error } = await client
          .from("housekeeping_assignments")
          .select("id, room_id, status, assigned_to")
          .eq("property_id", propertyId)
          .gte("created_at", today)
          .limit(200);
        if (error) throw new Error(error.message);
      },
    },
    {
      label: "RLS hot-path — user_property_roles lookup",
      async run(client) {
        const { error } = await client
          .from("user_property_roles")
          .select("property_id, role")
          .limit(50);
        if (error) throw new Error(error.message);
      },
    },
  ];
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
