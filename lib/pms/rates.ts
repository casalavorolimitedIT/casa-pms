import { createClient } from "@/lib/supabase/server";
import { NightlyRateBreakdown } from "@/types/pms";
import { eachDayOfInterval, parseISO, format } from "date-fns";

export interface RateCalculationInput {
  propertyId: string;
  roomTypeId: string;
  checkIn: string;  // ISO date string YYYY-MM-DD
  checkOut: string; // ISO date string YYYY-MM-DD
  currency?: string;
  ratePlanId?: string;
}

export interface RateCalculationResult {
  nightly: NightlyRateBreakdown[];
  totalMinor: number;
  currency: string;
}

/**
 * Calculates the per-night rate breakdown for a stay.
 *
 * Strategy:
 * 1. Fetch room type base rate (pms.room_types.base_rate_minor).
 * 2. Fetch date-specific overrides from pms.room_rates for the given rate plan.
 * 3. For each night in the stay range, apply the override if present,
 *    otherwise use the base rate.
 *
 * Replaced the M00 scaffold — actual Supabase-backed implementation.
 */
export async function calculateRate(
  input: RateCalculationInput,
): Promise<RateCalculationResult> {
  const supabase = await createClient();

  // Fetch room type base rate
  const { data: roomType } = await supabase
    .from("room_types")
    .select("base_rate_minor")
    .eq("id", input.roomTypeId)
    .single();

  const baseRateMinor = roomType?.base_rate_minor ?? 0;

  // Fetch any date-specific rate overrides for range
  const rateQuery = supabase
    .from("room_rates")
    .select("date_from, date_to, rate_minor")
    .eq("room_type_id", input.roomTypeId)
    .lte("date_from", input.checkOut)
    .gte("date_to", input.checkIn);

  if (input.ratePlanId) {
    rateQuery.eq("rate_plan_id", input.ratePlanId);
  }

  const { data: rateOverrides } = await rateQuery;

  // Build a map of date → rate_minor from overrides
  const overrideMap: Record<string, number> = {};
  for (const override of rateOverrides ?? []) {
    const days = eachDayOfInterval({
      start: parseISO(override.date_from),
      end: parseISO(override.date_to),
    });
    for (const day of days) {
      overrideMap[format(day, "yyyy-MM-dd")] = override.rate_minor;
    }
  }

  // Build nightly breakdown (checkIn inclusive, checkOut exclusive)
  const stayNights = eachDayOfInterval({
    start: parseISO(input.checkIn),
    end: parseISO(input.checkOut),
  });
  // Remove the last day (checkout day is not a billed night)
  stayNights.pop();

  const nightly: NightlyRateBreakdown[] = stayNights.map((night) => {
    const dateStr = format(night, "yyyy-MM-dd");
    const rateMinor = overrideMap[dateStr] ?? baseRateMinor;
    return { date: dateStr, rateMinor };
  });

  const totalMinor = nightly.reduce((sum, n) => sum + n.rateMinor, 0);

  return {
    nightly,
    totalMinor,
    currency: input.currency ?? "USD",
  };
}
