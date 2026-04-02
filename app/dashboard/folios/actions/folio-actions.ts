"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const [folioRes, chargesRes, paymentsRes] = await Promise.all([
    supabase
      .from("folios")
      .select(
        "id, status, currency_code, created_at, reservations(id, check_in, check_out, guests(first_name,last_name,email))",
      )
      .eq("id", folioId)
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
  const parsed = AddChargeSchema.safeParse({
    folioId: formData.get("folioId"),
    amountMinor: formData.get("amountMinor"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

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
  const parsed = AddPaymentSchema.safeParse({
    folioId: formData.get("folioId"),
    amountMinor: formData.get("amountMinor"),
    method: formData.get("method"),
    provider: formData.get("provider"),
    providerReference: formData.get("providerReference"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

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
  const { error } = await supabase.from("folios").update({ status: "closed" }).eq("id", folioId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/folios/${folioId}`);
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
