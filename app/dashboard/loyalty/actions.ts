"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const EarnSchema = z.object({
  guestId: z.string().uuid(),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  points: z.coerce.number().int().min(1),
  note: z.string().max(300).optional().or(z.literal("")),
});

const RedeemSchema = z.object({
  guestId: z.string().uuid(),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  points: z.coerce.number().int().min(1),
  note: z.string().max(300).optional().or(z.literal("")),
});

const UpgradeTierSchema = z.object({
  guestId: z.string().uuid(),
  tier: z.string().min(2).max(40),
  note: z.string().max(300).optional().or(z.literal("")),
});

async function getOrCreateAccount(guestId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("loyalty_accounts")
    .select("id, points_balance, tier")
    .eq("guest_id", guestId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("loyalty_accounts")
    .insert({ guest_id: guestId, points_balance: 0, tier: "bronze" })
    .select("id, points_balance, tier")
    .single();

  if (error) throw new Error(error.message);
  return created;
}

async function ensureGuestInActiveProperty(guestId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("reservations")
    .select("id")
    .eq("guest_id", guestId)
    .eq("property_id", activePropertyId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    throw new Error("Guest is not associated with the active property");
  }
}

export async function getLoyaltyContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const [accountsRes, ledgerRes, guestPoolRes] = await Promise.all([
    supabase
      .from("loyalty_accounts")
      .select("id, guest_id, tier, points_balance, created_at, guests(first_name,last_name,email)")
      .order("points_balance", { ascending: false })
      .limit(200),
    supabase
      .from("loyalty_ledger_entries")
      .select("id, entry_type, points_delta, note, created_at, guests(first_name,last_name), reservations(check_in)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("reservations")
      .select("guest_id, guests(first_name,last_name,email)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const guestMap = new Map<string, { first_name?: string; last_name?: string; email?: string }>();
  for (const row of guestPoolRes.data ?? []) {
    if (!row.guest_id) continue;
    const guest = Array.isArray(row.guests) ? row.guests[0] : row.guests;
    if (!guestMap.has(row.guest_id) && guest) {
      guestMap.set(row.guest_id, guest);
    }
  }

  const guestOptions = Array.from(guestMap.entries()).map(([id, guest]) => ({
    id,
    label: `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || guest.email || id,
  }));

  const accounts = accountsRes.data ?? [];

  return {
    accounts,
    ledger: ledgerRes.data ?? [],
    guestOptions,
    summary: {
      members: accounts.length,
      totalPoints: accounts.reduce((sum, account) => sum + account.points_balance, 0),
      topTierMembers: accounts.filter((a) => ["gold", "platinum", "diamond"].includes((a.tier ?? "").toLowerCase())).length,
    },
  };
}

export async function earnPoints(formData: FormData) {
  const parsed = EarnSchema.safeParse({
    guestId: formData.get("guestId"),
    reservationId: formData.get("reservationId"),
    points: formData.get("points"),
    note: formData.get("note"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid points payload" };

  await ensureGuestInActiveProperty(parsed.data.guestId);

  const supabase = await createClient();
  const account = await getOrCreateAccount(parsed.data.guestId);

  const nextBalance = account.points_balance + parsed.data.points;

  const { error: updateError } = await supabase
    .from("loyalty_accounts")
    .update({ points_balance: nextBalance })
    .eq("id", account.id);

  if (updateError) return { error: updateError.message };

  const { error: ledgerError } = await supabase.from("loyalty_ledger_entries").insert({
    loyalty_account_id: account.id,
    guest_id: parsed.data.guestId,
    reservation_id: parsed.data.reservationId || null,
    entry_type: "earn",
    points_delta: parsed.data.points,
    note: parsed.data.note || null,
  });

  if (ledgerError) return { error: ledgerError.message };

  revalidatePath("/dashboard/loyalty");
  return { success: true };
}

export async function redeemPoints(formData: FormData) {
  const parsed = RedeemSchema.safeParse({
    guestId: formData.get("guestId"),
    reservationId: formData.get("reservationId"),
    points: formData.get("points"),
    note: formData.get("note"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid redemption payload" };

  await ensureGuestInActiveProperty(parsed.data.guestId);

  const supabase = await createClient();
  const account = await getOrCreateAccount(parsed.data.guestId);

  if (account.points_balance < parsed.data.points) {
    return { error: "Insufficient points balance for redemption." };
  }

  const nextBalance = account.points_balance - parsed.data.points;

  const { error: updateError } = await supabase
    .from("loyalty_accounts")
    .update({ points_balance: nextBalance })
    .eq("id", account.id);

  if (updateError) return { error: updateError.message };

  const { error: ledgerError } = await supabase.from("loyalty_ledger_entries").insert({
    loyalty_account_id: account.id,
    guest_id: parsed.data.guestId,
    reservation_id: parsed.data.reservationId || null,
    entry_type: "redeem",
    points_delta: -parsed.data.points,
    note: parsed.data.note || null,
  });

  if (ledgerError) return { error: ledgerError.message };

  revalidatePath("/dashboard/loyalty");
  return { success: true };
}

export async function upgradeTier(formData: FormData) {
  const parsed = UpgradeTierSchema.safeParse({
    guestId: formData.get("guestId"),
    tier: formData.get("tier"),
    note: formData.get("note"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid tier update" };

  await ensureGuestInActiveProperty(parsed.data.guestId);

  const supabase = await createClient();
  const account = await getOrCreateAccount(parsed.data.guestId);

  const { error: updateError } = await supabase
    .from("loyalty_accounts")
    .update({ tier: parsed.data.tier.toLowerCase() })
    .eq("id", account.id);

  if (updateError) return { error: updateError.message };

  const { error: ledgerError } = await supabase.from("loyalty_ledger_entries").insert({
    loyalty_account_id: account.id,
    guest_id: parsed.data.guestId,
    entry_type: "tier_upgrade",
    points_delta: 0,
    note: parsed.data.note || `Tier upgraded to ${parsed.data.tier}`,
  });

  if (ledgerError) return { error: ledgerError.message };

  revalidatePath("/dashboard/loyalty");
  return { success: true };
}
