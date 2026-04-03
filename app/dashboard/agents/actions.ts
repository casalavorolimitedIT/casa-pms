"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateAgentSchema = z.object({
  propertyId: z.string().uuid(),
  companyName: z.string().min(1).max(120),
  contactName: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  defaultCommissionPercent: z.coerce.number().min(0).max(100),
  isActive: z.coerce.boolean().default(true),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const AssignCommissionSchema = z.object({
  propertyId: z.string().uuid(),
  travelAgentId: z.string().uuid(),
  reservationId: z.string().uuid(),
  commissionPercent: z.coerce.number().min(0).max(100),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const UpdateCommissionStatusSchema = z.object({
  commissionId: z.string().uuid(),
  payoutStatus: z.enum(["pending", "approved", "paid", "cancelled"]),
});

function calculateCommissionMinor(totalRateMinor: number | null, commissionPercent: number) {
  if (!totalRateMinor || totalRateMinor <= 0) return 0;
  return Math.round(totalRateMinor * (commissionPercent / 100));
}

export async function getAgentsContext(propertyId: string) {
  const supabase = await createClient();

  const [agentsRes, reservationsRes, commissionsRes] = await Promise.all([
    supabase
      .from("travel_agents")
      .select("id, company_name, contact_name, email, phone, default_commission_percent, is_active, notes, created_at")
      .eq("property_id", propertyId)
      .order("company_name", { ascending: true }),
    supabase
      .from("reservations")
      .select("id, status, check_in, check_out, total_rate_minor, source, guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in", "checked_out"])
      .order("check_in", { ascending: false })
      .limit(200),
    supabase
      .from("travel_agent_commissions")
      .select("id, commission_percent, commission_minor, payout_status, notes, created_at, travel_agents(company_name, contact_name), reservations(check_in, check_out, total_rate_minor, status, guests(first_name,last_name))")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const commissions = commissionsRes.data ?? [];

  return {
    agents: agentsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    commissions,
    summary: {
      activeAgents: (agentsRes.data ?? []).filter((agent) => agent.is_active).length,
      assignedBookings: commissions.length,
      pendingCommissionMinor: commissions
        .filter((commission) => commission.payout_status !== "paid" && commission.payout_status !== "cancelled")
        .reduce((sum, commission) => sum + (commission.commission_minor ?? 0), 0),
    },
  };
}

export async function createAgent(formData: FormData) {
  const parsed = CreateAgentSchema.safeParse({
    propertyId: formData.get("propertyId"),
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    defaultCommissionPercent: formData.get("defaultCommissionPercent"),
    isActive: formData.get("isActive") === "on",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid agent profile" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("travel_agents").insert({
    property_id: parsed.data.propertyId,
    company_name: parsed.data.companyName,
    contact_name: parsed.data.contactName || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    default_commission_percent: parsed.data.defaultCommissionPercent,
    is_active: parsed.data.isActive,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/agents");
  return { success: true };
}

export async function assignAgentRate(formData: FormData) {
  const parsed = AssignCommissionSchema.safeParse({
    propertyId: formData.get("propertyId"),
    travelAgentId: formData.get("travelAgentId"),
    reservationId: formData.get("reservationId"),
    commissionPercent: formData.get("commissionPercent"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid commission assignment" };
  }

  const supabase = await createClient();
  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select("id, total_rate_minor")
    .eq("id", parsed.data.reservationId)
    .eq("property_id", parsed.data.propertyId)
    .single();

  if (reservationError) return { error: reservationError.message };

  const commissionMinor = calculateCommissionMinor(reservation.total_rate_minor, parsed.data.commissionPercent);

  const { error } = await supabase.from("travel_agent_commissions").upsert(
    {
      property_id: parsed.data.propertyId,
      travel_agent_id: parsed.data.travelAgentId,
      reservation_id: parsed.data.reservationId,
      commission_percent: parsed.data.commissionPercent,
      commission_minor: commissionMinor,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "property_id,reservation_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/agents");
  return { success: true };
}

export async function updateCommissionStatus(formData: FormData) {
  const parsed = UpdateCommissionStatusSchema.safeParse({
    commissionId: formData.get("commissionId"),
    payoutStatus: formData.get("payoutStatus"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout status" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("travel_agent_commissions")
    .update({ payout_status: parsed.data.payoutStatus, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.commissionId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/agents");
  return { success: true };
}