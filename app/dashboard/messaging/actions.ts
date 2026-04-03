"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  buildTemplateMessage,
  dispatchOutboundMessage,
  MESSAGE_TEMPLATES,
  sanitizeMessagePreview,
  type MessageTemplateKey,
  type MessagingChannel,
} from "@/lib/pms/messaging";

const SendMessageSchema = z.object({
  propertyId: z.string().uuid(),
  reservationId: z.string().uuid(),
  channel: z.enum(["sms", "whatsapp", "email"]),
  externalAddress: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(2).max(2000),
});

const ReplySchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(2).max(2000),
});

const TemplateSchema = z.object({
  threadId: z.string().uuid(),
  templateKey: z.enum(["arrival_day", "late_checkout", "service_followup"]),
});

const MarkAsReadSchema = z.object({
  threadId: z.string().uuid(),
});

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function getGuestName(guestRaw: unknown) {
  if (!guestRaw) return "Guest";

  if (Array.isArray(guestRaw)) {
    const guest = guestRaw[0] as { first_name?: string; last_name?: string } | undefined;
    return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Guest";
  }

  const guest = guestRaw as { first_name?: string; last_name?: string };
  return `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || "Guest";
}

function getGuestContact(guestRaw: unknown, channel: MessagingChannel) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { email?: string; phone?: string } | undefined)
    : (guestRaw as { email?: string; phone?: string } | null);

  if (!guest) return "";
  return channel === "email" ? guest.email?.trim() ?? "" : guest.phone?.trim() ?? "";
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function persistOutboundMessage(input: {
  supabase: SupabaseServerClient;
  threadId: string;
  channel: MessagingChannel;
  destination: string;
  body: string;
  createdBy: string | null;
  templateKey?: MessageTemplateKey;
}) {
  const dispatch = await dispatchOutboundMessage({
    channel: input.channel,
    to: input.destination,
    body: input.body,
  });

  await input.supabase.from("messages").insert({
    thread_id: input.threadId,
    direction: "outbound",
    body: input.body,
    channel: input.channel,
    status: dispatch.status,
    template_key: input.templateKey ?? null,
    external_message_id: "externalMessageId" in dispatch ? dispatch.externalMessageId : null,
    external_address: input.destination,
    created_by: input.createdBy,
    metadata: "error" in dispatch ? { error: dispatch.error } : {},
  });

  await input.supabase
    .from("message_threads")
    .update({
      external_address: input.destination,
      status: dispatch.status === "failed" ? "open" : "waiting_on_guest",
      last_message_at: new Date().toISOString(),
      last_message_preview: sanitizeMessagePreview(input.body),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.threadId);

  return dispatch;
}

export async function getMessagingContext(propertyId: string, selectedThreadId?: string) {
  const supabase = await createClient();

  const [threadsRes, reservationsRes] = await Promise.all([
    supabase
      .from("message_threads")
      .select("id, guest_id, reservation_id, channel, external_address, status, last_message_at, last_message_preview, unread_count, created_at, guests(first_name,last_name,email,phone), reservations(id, check_in, check_out, status)")
      .eq("property_id", propertyId)
      .order("last_message_at", { ascending: false })
      .limit(60),
    supabase
      .from("reservations")
      .select("id, guest_id, status, check_in, check_out, guests(id, first_name, last_name, email, phone)")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const threads = threadsRes.data ?? [];
  const effectiveThreadId = selectedThreadId && threads.some((thread) => thread.id === selectedThreadId)
    ? selectedThreadId
    : threads[0]?.id ?? null;

  let messages: Array<{
    id: string;
    direction: string;
    body: string;
    channel: string;
    status: string;
    template_key: string | null;
    external_address: string | null;
    created_at: string;
    read_at: string | null;
  }> = [];

  if (effectiveThreadId) {
    const { data } = await supabase
      .from("messages")
      .select("id, direction, body, channel, status, template_key, external_address, created_at, read_at")
      .eq("thread_id", effectiveThreadId)
      .order("created_at", { ascending: true });

    messages = data ?? [];
  }

  return {
    threads,
    reservations: reservationsRes.data ?? [],
    selectedThreadId: effectiveThreadId,
    messages,
    templates: MESSAGE_TEMPLATES,
  };
}

export async function sendMessage(formData: FormData) {
  const parsed = SendMessageSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reservationId: formData.get("reservationId"),
    channel: formData.get("channel"),
    externalAddress: formData.get("externalAddress"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid message input");
  }

  const supabase = await createClient();
  const createdBy = await getCurrentUserId();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, guest_id, guests(first_name, last_name, email, phone)")
    .eq("id", parsed.data.reservationId)
    .eq("property_id", parsed.data.propertyId)
    .single();

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  const destination = parsed.data.externalAddress || getGuestContact(reservation.guests, parsed.data.channel);

  if (!destination) {
    throw new Error("Guest contact details are required for the selected channel");
  }

  const { data: existingThread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("property_id", parsed.data.propertyId)
    .eq("guest_id", reservation.guest_id)
    .eq("channel", parsed.data.channel)
    .eq("external_address", destination)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let threadId = existingThread?.id ?? null;

  if (!threadId) {
    const { data: thread } = await supabase
      .from("message_threads")
      .insert({
        property_id: parsed.data.propertyId,
        guest_id: reservation.guest_id,
        reservation_id: parsed.data.reservationId,
        channel: parsed.data.channel,
        external_address: destination,
        status: "open",
        last_message_at: new Date().toISOString(),
        last_message_preview: sanitizeMessagePreview(parsed.data.body),
      })
      .select("id")
      .single();

    threadId = thread?.id ?? null;
  }

  if (!threadId) {
    throw new Error("Unable to initialize thread");
  }

  await persistOutboundMessage({
    supabase,
    threadId,
    channel: parsed.data.channel,
    destination,
    body: parsed.data.body,
    createdBy,
  });

  revalidatePath("/dashboard/messaging");
}

export async function replyToThread(formData: FormData) {
  const parsed = ReplySchema.safeParse({
    threadId: formData.get("threadId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reply input");
  }

  const supabase = await createClient();
  const createdBy = await getCurrentUserId();

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, channel, external_address")
    .eq("id", parsed.data.threadId)
    .single();

  if (!thread?.external_address) {
    throw new Error("Thread does not have a delivery address yet");
  }

  await persistOutboundMessage({
    supabase,
    threadId: thread.id,
    channel: thread.channel as MessagingChannel,
    destination: thread.external_address,
    body: parsed.data.body,
    createdBy,
  });

  revalidatePath("/dashboard/messaging");
}

export async function sendTemplate(formData: FormData) {
  const parsed = TemplateSchema.safeParse({
    threadId: formData.get("threadId"),
    templateKey: formData.get("templateKey"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid template request");
  }

  const supabase = await createClient();
  const createdBy = await getCurrentUserId();

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, channel, external_address, guests(first_name, last_name)")
    .eq("id", parsed.data.threadId)
    .single();

  if (!thread?.external_address) {
    throw new Error("Thread does not have a delivery address yet");
  }

  const body = buildTemplateMessage(parsed.data.templateKey, getGuestName(thread.guests));

  await persistOutboundMessage({
    supabase,
    threadId: thread.id,
    channel: thread.channel as MessagingChannel,
    destination: thread.external_address,
    body,
    createdBy,
    templateKey: parsed.data.templateKey,
  });

  revalidatePath("/dashboard/messaging");
}

export async function markAsRead(formData: FormData) {
  const parsed = MarkAsReadSchema.safeParse({
    threadId: formData.get("threadId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid thread id");
  }

  const supabase = await createClient();
  const readAt = new Date().toISOString();

  await supabase
    .from("messages")
    .update({
      read_at: readAt,
      updated_at: readAt,
      status: "read",
    })
    .eq("thread_id", parsed.data.threadId)
    .eq("direction", "inbound")
    .is("read_at", null);

  await supabase
    .from("message_threads")
    .update({
      unread_count: 0,
      read_at: readAt,
      status: "open",
      updated_at: readAt,
    })
    .eq("id", parsed.data.threadId);

  revalidatePath("/dashboard/messaging");
}