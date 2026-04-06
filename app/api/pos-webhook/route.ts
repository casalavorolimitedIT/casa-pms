import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyHmacSha256Signature } from "@/lib/security/webhook-signature";

export const runtime = "nodejs";

type PosWebhookPayload = {
  externalReference: string;
  propertyId: string;
  reservationId?: string;
  folioId?: string;
  amountMinor: number;
  category?: string;
  description?: string;
  currencyCode?: string;
};

function parsePayload(raw: unknown): PosWebhookPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Record<string, unknown>;

  const externalReference = typeof payload.externalReference === "string" ? payload.externalReference.trim() : "";
  const propertyId = typeof payload.propertyId === "string" ? payload.propertyId.trim() : "";
  const reservationId = typeof payload.reservationId === "string" ? payload.reservationId.trim() : undefined;
  const folioId = typeof payload.folioId === "string" ? payload.folioId.trim() : undefined;
  const amountMinor = typeof payload.amountMinor === "number" ? payload.amountMinor : Number(payload.amountMinor);
  const category = typeof payload.category === "string" ? payload.category.trim() : "pos";
  const description = typeof payload.description === "string" ? payload.description.trim() : "POS webhook charge";
  const currencyCode = typeof payload.currencyCode === "string" ? payload.currencyCode.trim() : "USD";

  if (!externalReference || !propertyId || !Number.isFinite(amountMinor) || amountMinor <= 0) return null;

  return {
    externalReference,
    propertyId,
    reservationId,
    folioId,
    amountMinor,
    category,
    description,
    currencyCode: currencyCode.toUpperCase(),
  };
}

export async function POST(request: NextRequest) {
  const payloadRaw = await request.text();
  const signature = request.headers.get("x-pos-signature") ?? request.headers.get("x-signature");

  const secret = process.env.POS_WEBHOOK_SECRET;
  if (!verifyHmacSha256Signature(payloadRaw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const json = JSON.parse(payloadRaw) as unknown;
  const payload = parsePayload(json);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Webhook service role is not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "pms" },
    auth: { persistSession: false },
  });

  const { data: existingEvent } = await supabase
    .from("pos_webhook_events")
    .select("id, charge_id")
    .eq("external_reference", payload.externalReference)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ ok: true, idempotent: true, chargeId: existingEvent.charge_id ?? null });
  }

  const { data: event, error: eventError } = await supabase
    .from("pos_webhook_events")
    .insert({
      property_id: payload.propertyId,
      external_reference: payload.externalReference,
      payload: json,
    })
    .select("id")
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: eventError?.message ?? "Failed to persist webhook event" }, { status: 500 });
  }

  let folioId = payload.folioId?.trim() || "";

  if (!folioId && payload.reservationId) {
    const { data: existingFolio } = await supabase
      .from("folios")
      .select("id")
      .eq("reservation_id", payload.reservationId)
      .eq("status", "open")
      .maybeSingle();

    folioId = existingFolio?.id ?? "";

    if (!folioId) {
      const { data: createdFolio, error: createFolioError } = await supabase
        .from("folios")
        .insert({
          reservation_id: payload.reservationId,
          status: "open",
          currency_code: payload.currencyCode,
        })
        .select("id")
        .single();

      if (createFolioError || !createdFolio) {
        return NextResponse.json({ error: createFolioError?.message ?? "Unable to create folio" }, { status: 500 });
      }

      folioId = createdFolio.id;
    }
  }

  if (!folioId) {
    return NextResponse.json({ error: "Missing folio target (folioId or reservationId required)" }, { status: 400 });
  }

  const { data: charge, error: chargeError } = await supabase
    .from("folio_charges")
    .insert({
      folio_id: folioId,
      amount_minor: payload.amountMinor,
      category: payload.category ?? "pos",
      description: `${payload.description ?? "POS webhook charge"} [${payload.externalReference}]`,
    })
    .select("id")
    .single();

  if (chargeError || !charge) {
    return NextResponse.json({ error: chargeError?.message ?? "Unable to post folio charge" }, { status: 500 });
  }

  await supabase
    .from("pos_webhook_events")
    .update({ charge_id: charge.id, processed_at: new Date().toISOString() })
    .eq("id", event.id);

  return NextResponse.json({ ok: true, chargeId: charge.id, folioId });
}
