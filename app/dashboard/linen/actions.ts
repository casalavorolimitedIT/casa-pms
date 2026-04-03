"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const LinenTxnSchema = z.object({
  propertyId: z.string().uuid(),
  roomTypeId: z.string().uuid().optional().or(z.literal("")),
  txnType: z.enum(["sent", "returned", "damaged"]),
  quantity: z.coerce.number().int().min(1).max(2000),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export async function getLinenContext(propertyId: string) {
  const supabase = await createClient();

  const [txnsRes, roomTypesRes] = await Promise.all([
    supabase
      .from("linen_transactions")
      .select("id, room_type_id, txn_type, quantity, note, created_at, room_types(name)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("room_types")
      .select("id, name")
      .eq("property_id", propertyId)
      .order("name", { ascending: true }),
  ]);

  return {
    transactions: txnsRes.data ?? [],
    roomTypes: roomTypesRes.data ?? [],
  };
}

export async function recordLinenTransaction(formData: FormData) {
  const parsed = LinenTxnSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomTypeId: formData.get("roomTypeId"),
    txnType: formData.get("txnType"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid linen transaction" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("linen_transactions").insert({
    property_id: parsed.data.propertyId,
    room_type_id: parsed.data.roomTypeId || null,
    txn_type: parsed.data.txnType,
    quantity: parsed.data.quantity,
    note: parsed.data.note || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/linen");
  return { success: true };
}
