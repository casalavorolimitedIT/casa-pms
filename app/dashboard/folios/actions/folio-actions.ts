"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActivePropertyId } from "@/lib/pms/property-context";

const AddChargeSchema = z.object({
  folioId: z.string().uuid(),
  amountMinor: z.coerce.number().int().min(0),
  category: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});

const AddPaymentSchema = z.object({
  folioId: z.string().uuid(),
  amountMinor: z.coerce.number().int().min(0),
  method: z.string().min(1).max(40),
  provider: z.string().max(40).optional(),
  providerReference: z.string().max(120).optional(),
});

const SplitChargeSchema = z.object({
  folioId: z.string().uuid(),
  chargeId: z.string().uuid(),
  splitAmountMinor: z.coerce.number().int().positive(),
  splitLabel: z.string().min(1).max(80).default("split"),
});

const TransferChargeSchema = z.object({
  fromFolioId: z.string().uuid(),
  toFolioId: z.string().uuid(),
  chargeId: z.string().uuid(),
});

async function getActivePropertyIdOrThrow() {
  const activePropertyId = await getActivePropertyId();
  if (!activePropertyId) {
    throw new Error("No active property selected");
  }

  return activePropertyId;
}

async function folioBelongsToProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folioId: string,
  propertyId: string,
) {
  const { data, error } = await supabase
    .from("folios")
    .select("id, reservations!inner(property_id)")
    .eq("id", folioId)
    .eq("reservations.property_id", propertyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function getFolios(propertyId: string, query = "") {
  const supabase = await createClient();

  let req = supabase
    .from("folios")
    .select(
      "id, status, currency_code, created_at, reservations(id, property_id, check_in, check_out, guests(first_name,last_name))",
    )
    .eq("reservations.property_id", propertyId)
    .order("created_at", { ascending: false });

  if (query.trim()) {
    req = req.ilike("id", `%${query.trim()}%`);
  }

  const { data, error } = await req.limit(200);
  if (error) return { folios: [], error: error.message };
  return { folios: data ?? [] };
}

export async function getFolioById(folioId: string) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const [folioRes, chargesRes, paymentsRes] = await Promise.all([
    supabase
      .from("folios")
      .select(
        "id, status, currency_code, created_at, reservations!inner(id, property_id, check_in, check_out, guests(first_name,last_name,email))",
      )
      .eq("id", folioId)
      .eq("reservations.property_id", activePropertyId)
      .single(),
    supabase
      .from("folio_charges")
      .select("id, amount_minor, category, description, created_at")
      .eq("folio_id", folioId)
      .order("created_at", { ascending: true }),
    supabase
      .from("folio_payments")
      .select("id, amount_minor, method, provider, provider_reference, created_at")
      .eq("folio_id", folioId)
      .order("created_at", { ascending: true }),
  ]);

  if (folioRes.error) return { error: folioRes.error.message };
  return {
    folio: folioRes.data,
    charges: chargesRes.data ?? [],
    payments: paymentsRes.data ?? [],
  };
}

export async function addFolioCharge(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = AddChargeSchema.safeParse({
    folioId: formData.get("folioId"),
    amountMinor: formData.get("amountMinor"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid charge input" };

  const inScope = await folioBelongsToProperty(supabase, parsed.data.folioId, activePropertyId);
  if (!inScope) return { error: "Folio not found for the active property" };

  const { error } = await supabase.from("folio_charges").insert({
    folio_id: parsed.data.folioId,
    amount_minor: parsed.data.amountMinor,
    category: parsed.data.category,
    description: parsed.data.description ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/folios/${parsed.data.folioId}`);
  return { success: true };
}

export async function addFolioPayment(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = AddPaymentSchema.safeParse({
    folioId: formData.get("folioId"),
    amountMinor: formData.get("amountMinor"),
    method: formData.get("method"),
    provider: formData.get("provider"),
    providerReference: formData.get("providerReference"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment input" };

  const inScope = await folioBelongsToProperty(supabase, parsed.data.folioId, activePropertyId);
  if (!inScope) return { error: "Folio not found for the active property" };

  const { error } = await supabase.from("folio_payments").insert({
    folio_id: parsed.data.folioId,
    amount_minor: parsed.data.amountMinor,
    method: parsed.data.method,
    provider: parsed.data.provider ?? null,
    provider_reference: parsed.data.providerReference ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/folios/${parsed.data.folioId}`);
  return { success: true };
}

export async function closeFolio(folioId: string) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();

  const inScope = await folioBelongsToProperty(supabase, folioId, activePropertyId);
  if (!inScope) return { error: "Folio not found for the active property" };

  const { error } = await supabase.from("folios").update({ status: "closed" }).eq("id", folioId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/folios/${folioId}`);
  revalidatePath("/dashboard/folios");
  return { success: true };
}

export async function splitFolioCharge(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = SplitChargeSchema.safeParse({
    folioId: formData.get("folioId"),
    chargeId: formData.get("chargeId"),
    splitAmountMinor: formData.get("splitAmountMinor"),
    splitLabel: formData.get("splitLabel") || "split",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid split input" };
  }

  const inScope = await folioBelongsToProperty(supabase, parsed.data.folioId, activePropertyId);
  if (!inScope) return { error: "Folio not found for the active property" };

  const { data: originalCharge, error: chargeError } = await supabase
    .from("folio_charges")
    .select("id, folio_id, amount_minor, category, description")
    .eq("id", parsed.data.chargeId)
    .eq("folio_id", parsed.data.folioId)
    .single();

  if (chargeError || !originalCharge) {
    return { error: chargeError?.message ?? "Charge not found" };
  }

  if (parsed.data.splitAmountMinor >= originalCharge.amount_minor) {
    return { error: "Split amount must be smaller than original charge amount." };
  }

  const remainder = originalCharge.amount_minor - parsed.data.splitAmountMinor;

  const { error: updateError } = await supabase
    .from("folio_charges")
    .update({
      amount_minor: remainder,
      description: `${originalCharge.description ?? ""} (split remainder)`.trim(),
    })
    .eq("id", originalCharge.id);

  if (updateError) return { error: updateError.message };

  const { error: insertError } = await supabase.from("folio_charges").insert({
    folio_id: parsed.data.folioId,
    amount_minor: parsed.data.splitAmountMinor,
    category: `${originalCharge.category}:${parsed.data.splitLabel}`,
    description: `Split from charge ${originalCharge.id.slice(0, 8)}`,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath(`/dashboard/folios/${parsed.data.folioId}`);
  return { success: true };
}

export async function transferFolioCharge(formData: FormData) {
  const supabase = await createClient();
  const activePropertyId = await getActivePropertyIdOrThrow();
  const parsed = TransferChargeSchema.safeParse({
    fromFolioId: formData.get("fromFolioId"),
    toFolioId: formData.get("toFolioId"),
    chargeId: formData.get("chargeId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transfer input" };
  }

  if (parsed.data.fromFolioId === parsed.data.toFolioId) {
    return { error: "Destination folio must be different from source folio." };
  }

  const [sourceInScope, destinationInScope] = await Promise.all([
    folioBelongsToProperty(supabase, parsed.data.fromFolioId, activePropertyId),
    folioBelongsToProperty(supabase, parsed.data.toFolioId, activePropertyId),
  ]);

  if (!sourceInScope || !destinationInScope) {
    return { error: "Both folios must belong to the active property" };
  }

  const { data: charge, error: chargeError } = await supabase
    .from("folio_charges")
    .select("id, folio_id, amount_minor, category, description")
    .eq("id", parsed.data.chargeId)
    .eq("folio_id", parsed.data.fromFolioId)
    .single();

  if (chargeError || !charge) {
    return { error: chargeError?.message ?? "Charge not found for transfer." };
  }

  // Keep immutable audit trail in source folio by zeroing out transferred charge
  // and writing a mirrored charge in destination folio.
  const { error: srcUpdateError } = await supabase
    .from("folio_charges")
    .update({
      amount_minor: 0,
      description: `${charge.description ?? ""} (transferred to ${parsed.data.toFolioId.slice(0, 8)})`.trim(),
    })
    .eq("id", charge.id);

  if (srcUpdateError) return { error: srcUpdateError.message };

  const { error: destInsertError } = await supabase.from("folio_charges").insert({
    folio_id: parsed.data.toFolioId,
    amount_minor: charge.amount_minor,
    category: charge.category,
    description: `Transferred from folio ${parsed.data.fromFolioId.slice(0, 8)}`,
  });

  if (destInsertError) return { error: destInsertError.message };

  revalidatePath(`/dashboard/folios/${parsed.data.fromFolioId}`);
  revalidatePath(`/dashboard/folios/${parsed.data.toFolioId}`);
  revalidatePath("/dashboard/folios");
  return { success: true };
}

export async function getCompanyBalances() {
  const supabase = await createClient();

  // Placeholder city-ledger aggregation by provider name until dedicated company ledger tables are added.
  const { data, error } = await supabase
    .from("folio_payments")
    .select("provider, amount_minor")
    .not("provider", "is", null);

  if (error) return { balances: [], error: error.message };

  const balances = Object.entries(
    (data ?? []).reduce<Record<string, number>>((acc, row) => {
      const key = row.provider ?? "Unassigned";
      acc[key] = (acc[key] ?? 0) + row.amount_minor;
      return acc;
    }, {}),
  ).map(([company, amountMinor]) => ({ company, amountMinor }));

  return { balances };
}
