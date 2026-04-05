"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertActivePropertyAccess, requireActivePropertyId } from "@/lib/pms/property-context";

const CreateRequestSchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid().optional().or(z.literal("")),
  category: z.string().min(2).max(64),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  description: z.string().min(5).max(1000),
  billable: z.coerce.boolean().default(false),
  chargeAmountMinor: z.coerce.number().int().min(0).default(0),
  slaDueAt: z.string().optional().or(z.literal("")),
});

const AssignRequestSchema = z.object({
  requestId: z.string().uuid(),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
});

const UpdateStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["open", "assigned", "in_progress", "completed", "cancelled"]),
});

const UpdateRequestSchema = z.object({
  requestId: z.string().uuid(),
  category: z.string().min(2).max(64),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  description: z.string().min(5).max(1000),
  billable: z.coerce.boolean().default(false),
  chargeAmountMinor: z.coerce.number().int().min(0).default(0),
  slaDueAt: z.string().optional().or(z.literal("")),
});

const DeleteRequestSchema = z.object({
  requestId: z.string().uuid(),
});

const ToggleBillableSchema = z.object({
  requestId: z.string().uuid(),
  billable: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const PostChargeSchema = z.object({
  requestId: z.string().uuid(),
  folioId: z.string().uuid(),
  amountMinor: z.coerce.number().int().min(1),
});

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function ensureRequestInActiveProperty(requestId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("concierge_requests")
    .select("id")
    .eq("id", requestId)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Concierge request not found for the active property");
  }
}

async function ensureFolioInActiveProperty(folioId: string) {
  const supabase = await createClient();
  const activePropertyId = await requireActivePropertyId();

  const { data } = await supabase
    .from("folios")
    .select("id, reservations!inner(property_id)")
    .eq("id", folioId)
    .eq("reservations.property_id", activePropertyId)
    .maybeSingle();

  if (!data) {
    throw new Error("Folio not found for the active property");
  }
}

export async function getConciergeContext(propertyId: string) {
  await assertActivePropertyAccess(propertyId);
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  const organizationId = property?.organization_id ?? "";

  const [requestsRes, staffRes, reservationRes, foliosRes] = await Promise.all([
    supabase
      .from("concierge_requests")
      .select("id, category, priority, status, description, assigned_to, created_at, sla_due_at, is_billable, charge_amount_minor, folio_id, posted_charge_id, reservations(id), guests(first_name,last_name), profiles:assigned_to(full_name,email)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),
    supabase
      .from("reservations")
      .select("id, check_in, check_out, status, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("folios")
      .select("id, status, reservations(id, property_id, guests(first_name,last_name))")
      .eq("reservations.property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return {
    requests: requestsRes.data ?? [],
    staff: staffRes.data ?? [],
    reservations: reservationRes.data ?? [],
    folios: foliosRes.data ?? [],
  };
}

export async function createRequest(formData: FormData) {
  const parsed = CreateRequestSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    description: formData.get("description"),
    billable: formData.get("billable") === "on",
    chargeAmountMinor: formData.get("chargeAmountMinor"),
    slaDueAt: formData.get("slaDueAt"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await assertActivePropertyAccess(parsed.data.propertyId);

  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const isBillable = parsed.data.billable;
  const chargeAmountMinor = isBillable ? parsed.data.chargeAmountMinor : null;

  const { error } = await supabase.from("concierge_requests").insert({
    property_id: parsed.data.propertyId,
    reservation_id: parsed.data.reservationId || null,
    category: parsed.data.category,
    priority: parsed.data.priority,
    description: parsed.data.description,
    is_billable: isBillable,
    charge_amount_minor: chargeAmountMinor,
    sla_due_at: parsed.data.slaDueAt || null,
    created_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/concierge");
}

export async function assignRequest(formData: FormData) {
  const parsed = AssignRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    assignedTo: formData.get("assignedTo"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureRequestInActiveProperty(parsed.data.requestId);

  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    assigned_to: parsed.data.assignedTo || null,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.assignedTo) {
    updates.status = "assigned";
  }

  const { error } = await supabase
    .from("concierge_requests")
    .update(updates)
    .eq("id", parsed.data.requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/concierge");
}

export async function updateRequestStatus(formData: FormData) {
  const parsed = UpdateStatusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureRequestInActiveProperty(parsed.data.requestId);

  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === "completed") {
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("concierge_requests")
    .update(updates)
    .eq("id", parsed.data.requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/concierge");
}

export async function updateRequest(formData: FormData) {
  const parsed = UpdateRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    description: formData.get("description"),
    billable: formData.get("billable") === "on",
    chargeAmountMinor: formData.get("chargeAmountMinor"),
    slaDueAt: formData.get("slaDueAt"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureRequestInActiveProperty(parsed.data.requestId);

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("concierge_requests")
    .select("id, posted_charge_id")
    .eq("id", parsed.data.requestId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Request not found");
  }

  if (!parsed.data.billable && existing.posted_charge_id) {
    throw new Error("Request already has a posted folio charge and cannot be marked non-billable.");
  }

  const isBillable = parsed.data.billable;
  const chargeAmountMinor = isBillable ? parsed.data.chargeAmountMinor : null;

  const updates: Record<string, string | number | boolean | null> = {
    category: parsed.data.category,
    priority: parsed.data.priority,
    description: parsed.data.description,
    is_billable: isBillable,
    charge_amount_minor: chargeAmountMinor,
    sla_due_at: parsed.data.slaDueAt || null,
    updated_at: new Date().toISOString(),
  };

  if (!isBillable && !existing.posted_charge_id) {
    updates.folio_id = null;
  }

  const { error } = await supabase
    .from("concierge_requests")
    .update(updates)
    .eq("id", parsed.data.requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/concierge");
}

export async function deleteRequest(formData: FormData) {
  const parsed = DeleteRequestSchema.safeParse({
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureRequestInActiveProperty(parsed.data.requestId);

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("concierge_requests")
    .select("id, posted_charge_id")
    .eq("id", parsed.data.requestId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Request not found");
  }

  if (existing.posted_charge_id) {
    throw new Error("This request already posted a folio charge and cannot be deleted.");
  }

  const { error } = await supabase
    .from("concierge_requests")
    .delete()
    .eq("id", parsed.data.requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/concierge");
}

export async function setRequestBillable(formData: FormData) {
  const parsed = ToggleBillableSchema.safeParse({
    requestId: formData.get("requestId"),
    billable: formData.get("billable"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureRequestInActiveProperty(parsed.data.requestId);

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("concierge_requests")
    .select("id, is_billable, posted_charge_id")
    .eq("id", parsed.data.requestId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Request not found");
  }

  if (!parsed.data.billable && existing.posted_charge_id) {
    throw new Error("Request already has a posted folio charge and cannot be marked non-billable.");
  }

  const updates: Record<string, string | number | boolean | null> = {
    is_billable: parsed.data.billable,
    updated_at: new Date().toISOString(),
  };

  if (!parsed.data.billable) {
    updates.charge_amount_minor = null;
    updates.folio_id = null;
  } else {
    updates.charge_amount_minor = 0;
  }

  const { error } = await supabase
    .from("concierge_requests")
    .update(updates)
    .eq("id", parsed.data.requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/concierge");
}

export async function postConciergeCharge(formData: FormData) {
  const parsed = PostChargeSchema.safeParse({
    requestId: formData.get("requestId"),
    folioId: formData.get("folioId"),
    amountMinor: formData.get("amountMinor"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureRequestInActiveProperty(parsed.data.requestId);
  await ensureFolioInActiveProperty(parsed.data.folioId);

  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from("concierge_requests")
    .select("id, category, description, posted_charge_id")
    .eq("id", parsed.data.requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? "Request not found");
  }

  if (request.posted_charge_id) {
    throw new Error("Charge already posted for this request.");
  }

  const { data: charge, error: chargeError } = await supabase
    .from("folio_charges")
    .insert({
      folio_id: parsed.data.folioId,
      amount_minor: parsed.data.amountMinor,
      category: request.category,
      description: `Concierge: ${request.description}`,
    })
    .select("id")
    .single();

  if (chargeError || !charge) {
    throw new Error(chargeError?.message ?? "Unable to post charge");
  }

  const { error: updateError } = await supabase
    .from("concierge_requests")
    .update({
      folio_id: parsed.data.folioId,
      charge_amount_minor: parsed.data.amountMinor,
      posted_charge_id: charge.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/dashboard/concierge");
}
