"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateCorporateSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1).max(160),
  creditLimitMinor: z.coerce.number().int().min(0),
});

const AssignRateSchema = z.object({
  propertyId: z.string().uuid(),
  corporateAccountId: z.string().uuid(),
  ratePlanId: z.string().uuid(),
  discountPercent: z.coerce.number().min(0).max(100),
});

const GenerateInvoiceSchema = z.object({
  propertyId: z.string().uuid(),
  corporateAccountId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
});

const PostPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: z.coerce.number().int().min(1),
  method: z.string().min(2).max(50),
  reference: z.string().max(120).optional().or(z.literal("")),
});

export async function getCorporateContext(propertyId: string) {
  const supabase = await createClient();

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .single();

  if (propertyError) {
    return {
      accounts: [],
      assignments: [],
      invoices: [],
      ratePlans: [],
      summary: { accounts: 0, openInvoices: 0, receivableMinor: 0 },
      error: propertyError.message,
    };
  }

  const [accountsRes, assignmentsRes, invoicesRes, ratePlansRes] = await Promise.all([
    supabase
      .from("corporate_accounts")
      .select("id, name, credit_limit_minor, created_at")
      .eq("organization_id", property.organization_id)
      .order("name", { ascending: true }),
    supabase
      .from("corporate_rate_assignments")
      .select("id, corporate_account_id, rate_plan_id, discount_percent, is_active, corporate_accounts(name), rate_plans(name)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("corporate_invoices")
      .select("id, corporate_account_id, period_start, period_end, total_minor, status, created_at, corporate_accounts(name)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("rate_plans")
      .select("id, name")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  const invoices = invoicesRes.data ?? [];

  return {
    accounts: accountsRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    invoices,
    ratePlans: ratePlansRes.data ?? [],
    summary: {
      accounts: (accountsRes.data ?? []).length,
      openInvoices: invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "void").length,
      receivableMinor: invoices
        .filter((invoice) => invoice.status !== "paid" && invoice.status !== "void")
        .reduce((sum, invoice) => sum + invoice.total_minor, 0),
    },
  };
}

export async function createCorporateAccount(formData: FormData) {
  const parsed = CreateCorporateSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    creditLimitMinor: formData.get("creditLimitMinor"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid account profile" };

  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", parsed.data.propertyId)
    .single();

  if (propertyError) return { error: propertyError.message };

  const { error } = await supabase.from("corporate_accounts").insert({
    organization_id: property.organization_id,
    name: parsed.data.name,
    credit_limit_minor: parsed.data.creditLimitMinor,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/corporate");
  return { success: true };
}

export async function assignCorporateRate(formData: FormData) {
  const parsed = AssignRateSchema.safeParse({
    propertyId: formData.get("propertyId"),
    corporateAccountId: formData.get("corporateAccountId"),
    ratePlanId: formData.get("ratePlanId"),
    discountPercent: formData.get("discountPercent"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid corporate assignment" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("corporate_rate_assignments")
    .upsert(
      {
        property_id: parsed.data.propertyId,
        corporate_account_id: parsed.data.corporateAccountId,
        rate_plan_id: parsed.data.ratePlanId,
        discount_percent: parsed.data.discountPercent,
        is_active: true,
      },
      { onConflict: "property_id,corporate_account_id,rate_plan_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/corporate");
  return { success: true };
}

export async function generateMonthlyInvoice(formData: FormData) {
  const parsed = GenerateInvoiceSchema.safeParse({
    propertyId: formData.get("propertyId"),
    corporateAccountId: formData.get("corporateAccountId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid invoice period" };

  const supabase = await createClient();

  const { data: account, error: accountError } = await supabase
    .from("corporate_accounts")
    .select("id, name")
    .eq("id", parsed.data.corporateAccountId)
    .single();

  if (accountError) return { error: accountError.message };

  const { data: assignments, error: assignmentsError } = await supabase
    .from("corporate_rate_assignments")
    .select("rate_plan_id")
    .eq("property_id", parsed.data.propertyId)
    .eq("corporate_account_id", parsed.data.corporateAccountId)
    .eq("is_active", true);

  if (assignmentsError) return { error: assignmentsError.message };

  const ratePlanIds = (assignments ?? []).map((row) => row.rate_plan_id).filter(Boolean);

  const { data: sourceReservations, error: sourceReservationError } = await supabase
    .from("reservations")
    .select("id, total_rate_minor")
    .eq("property_id", parsed.data.propertyId)
    .lte("check_in", parsed.data.periodEnd)
    .gte("check_out", parsed.data.periodStart)
    .or(
      [
        `source.ilike.%${account.name}%`,
        `source.ilike.%corporate:${account.id}%`,
        `source.ilike.%corp:${account.id}%`,
      ].join(","),
    );

  if (sourceReservationError) return { error: sourceReservationError.message };

  let ratePlanReservations: Array<{ id: string; total_rate_minor: number | null }> = [];
  if (ratePlanIds.length > 0) {
    const { data, error: ratePlanReservationError } = await supabase
      .from("reservations")
      .select("id, total_rate_minor")
      .eq("property_id", parsed.data.propertyId)
      .lte("check_in", parsed.data.periodEnd)
      .gte("check_out", parsed.data.periodStart)
      .in("rate_plan_id", ratePlanIds);

    if (ratePlanReservationError) return { error: ratePlanReservationError.message };
    ratePlanReservations = data ?? [];
  }

  const mergedReservations = [...(sourceReservations ?? []), ...ratePlanReservations];
  const uniqueReservations = new Map<string, { id: string; total_rate_minor: number | null }>();
  for (const reservation of mergedReservations) {
    uniqueReservations.set(reservation.id, reservation);
  }

  const reservations = Array.from(uniqueReservations.values());

  if (reservations.length === 0) {
    return {
      error:
        "No corporate-linked reservations found for this period. Link reservations using a corporate-assigned rate plan or source tags like 'corporate:<account-id>' or include the company name in source.",
    };
  }

  const totalMinor = reservations.reduce((sum, reservation) => sum + (reservation.total_rate_minor ?? 0), 0);

  const { error } = await supabase
    .from("corporate_invoices")
    .upsert(
      {
        property_id: parsed.data.propertyId,
        corporate_account_id: parsed.data.corporateAccountId,
        period_start: parsed.data.periodStart,
        period_end: parsed.data.periodEnd,
        total_minor: totalMinor,
        status: "issued",
      },
      { onConflict: "property_id,corporate_account_id,period_start,period_end" },
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/corporate");
  return { success: true };
}

export async function postCorporatePayment(formData: FormData) {
  const parsed = PostPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amountMinor: formData.get("amountMinor"),
    method: formData.get("method"),
    reference: formData.get("reference"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment payload" };

  const supabase = await createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("corporate_invoices")
    .select("id, total_minor")
    .eq("id", parsed.data.invoiceId)
    .single();

  if (invoiceError) return { error: invoiceError.message };

  const { error: paymentError } = await supabase.from("corporate_payments").insert({
    invoice_id: parsed.data.invoiceId,
    amount_minor: parsed.data.amountMinor,
    method: parsed.data.method,
    reference: parsed.data.reference || null,
  });

  if (paymentError) return { error: paymentError.message };

  const { data: payments } = await supabase
    .from("corporate_payments")
    .select("amount_minor")
    .eq("invoice_id", parsed.data.invoiceId);

  const paidMinor = (payments ?? []).reduce((sum, payment) => sum + payment.amount_minor, 0);
  const nextStatus = paidMinor >= invoice.total_minor ? "paid" : "issued";

  const { error: statusError } = await supabase
    .from("corporate_invoices")
    .update({ status: nextStatus })
    .eq("id", parsed.data.invoiceId);

  if (statusError) return { error: statusError.message };

  revalidatePath("/dashboard/corporate");
  return { success: true };
}
