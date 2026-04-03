"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const PostMinibarSchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  roomId: z.string().uuid(),
  itemName: z.string().min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(200),
  amountMinor: z.coerce.number().int().min(0),
});

export async function getMinibarContext(propertyId: string) {
  const supabase = await createClient();

  const [postingsRes, reservationsRes] = await Promise.all([
    supabase
      .from("minibar_postings")
      .select("id, reservation_id, room_id, item_name, quantity, amount_minor, status, folio_charge_id, posted_at, reservations(id, check_in, guests(first_name,last_name)), rooms(room_number)")
      .eq("property_id", propertyId)
      .order("posted_at", { ascending: false })
      .limit(300),
    supabase
      .from("reservations")
      .select("id, check_in, status, reservation_rooms(room_id, rooms(id, room_number)), guests(first_name,last_name)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("check_in", { ascending: true })
      .limit(100),
  ]);

  return {
    postings: postingsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
  };
}

export async function postMinibarCharge(formData: FormData) {
  const parsed = PostMinibarSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    roomId: formData.get("roomId"),
    itemName: formData.get("itemName"),
    quantity: formData.get("quantity"),
    amountMinor: formData.get("amountMinor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid minibar charge input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: folio } = await supabase
    .from("folios")
    .select("id")
    .eq("reservation_id", parsed.data.reservationId)
    .maybeSingle();

  if (!folio) {
    const { data: created, error: folioError } = await supabase
      .from("folios")
      .insert({
        reservation_id: parsed.data.reservationId,
        status: "open",
        currency_code: "USD",
      })
      .select("id")
      .single();

    if (folioError || !created) return { error: folioError?.message ?? "Unable to create folio" };
    folio = created;
  }

  const totalMinor = parsed.data.amountMinor * parsed.data.quantity;

  const { data: charge, error: chargeError } = await supabase
    .from("folio_charges")
    .insert({
      folio_id: folio.id,
      amount_minor: totalMinor,
      category: "minibar",
      description: `${parsed.data.itemName} x${parsed.data.quantity}`,
    })
    .select("id")
    .single();

  if (chargeError || !charge) {
    return { error: chargeError?.message ?? "Unable to post folio charge" };
  }

  const { error } = await supabase.from("minibar_postings").insert({
    property_id: parsed.data.propertyId,
    reservation_id: parsed.data.reservationId,
    room_id: parsed.data.roomId,
    item_name: parsed.data.itemName,
    quantity: parsed.data.quantity,
    amount_minor: totalMinor,
    status: "posted",
    folio_charge_id: charge.id,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/minibar");
  revalidatePath(`/dashboard/folios/${folio.id}`);
  return { success: true };
}
