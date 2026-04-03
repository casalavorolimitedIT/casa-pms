import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeMessagePreview, type MessagingChannel } from "@/lib/pms/messaging";

function inferChannel(fromAddress: string): MessagingChannel {
  if (fromAddress.startsWith("whatsapp:")) {
    return "whatsapp";
  }

  if (fromAddress.includes("@")) {
    return "email";
  }

  return "sms";
}

function toParamsObject(params: URLSearchParams) {
  return Object.fromEntries(params.entries());
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    return NextResponse.json({ error: "Missing Twilio auth token" }, { status: 500 });
  }

  const payload = await request.text();
  const params = new URLSearchParams(payload);
  const signature = request.headers.get("x-twilio-signature");

  if (!signature || !twilio.validateRequest(authToken, signature, request.url, toParamsObject(params))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const fromAddress = params.get("From")?.trim() ?? "";
  const body = params.get("Body")?.trim() || (Number(params.get("NumMedia") ?? "0") > 0 ? "Guest sent a media attachment." : "");

  if (!fromAddress || !body) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const channel = inferChannel(fromAddress);
  const supabase = createAdminClient();
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, unread_count")
    .eq("external_address", fromAddress)
    .eq("channel", channel)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const receivedAt = new Date().toISOString();

  await supabase.from("messages").insert({
    thread_id: thread.id,
    direction: "inbound",
    body,
    channel,
    status: "received",
    external_message_id: params.get("MessageSid"),
    external_address: fromAddress,
    metadata: {
      profile_name: params.get("ProfileName"),
      num_media: Number(params.get("NumMedia") ?? "0"),
    },
    updated_at: receivedAt,
  });

  await supabase
    .from("message_threads")
    .update({
      unread_count: (thread.unread_count ?? 0) + 1,
      status: "waiting_on_staff",
      last_message_at: receivedAt,
      last_message_preview: sanitizeMessagePreview(body),
      updated_at: receivedAt,
    })
    .eq("id", thread.id);

  return NextResponse.json({ ok: true });
}