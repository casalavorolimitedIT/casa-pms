import twilio from "twilio";

export type MessagingChannel = "sms" | "whatsapp" | "email";
export type MessageTemplateKey = "arrival_day" | "late_checkout" | "service_followup";

type TemplateDefinition = {
  key: MessageTemplateKey;
  label: string;
  body: string;
};

export const MESSAGE_TEMPLATES: TemplateDefinition[] = [
  {
    key: "arrival_day",
    label: "Arrival Day Welcome",
    body: "Hello {{guestName}}, welcome to Casa PMS. Reply here if you need transport, early check-in support, or room preferences before arrival.",
  },
  {
    key: "late_checkout",
    label: "Late Check-out Offer",
    body: "Hello {{guestName}}, late check-out is available today subject to housekeeping flow. Reply if you would like the front desk team to reserve it for you.",
  },
  {
    key: "service_followup",
    label: "Service Follow-up",
    body: "Hello {{guestName}}, checking in from guest services. Reply here if anything in your room or stay needs attention and we will coordinate it immediately.",
  },
];

export function sanitizeMessagePreview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 140);
}

export function buildTemplateMessage(templateKey: MessageTemplateKey, guestName: string) {
  const template = MESSAGE_TEMPLATES.find((entry) => entry.key === templateKey);

  if (!template) {
    throw new Error("Template not found");
  }

  return template.body.replaceAll("{{guestName}}", guestName || "guest");
}

function formatTwilioAddress(channel: MessagingChannel, value: string) {
  const trimmed = value.trim();

  if (channel === "whatsapp" && !trimmed.startsWith("whatsapp:")) {
    return `whatsapp:${trimmed}`;
  }

  return trimmed;
}

export async function dispatchOutboundMessage(input: {
  channel: MessagingChannel;
  to: string;
  body: string;
}) {
  if (input.channel === "email") {
    return { status: "queued" as const };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromAddress = input.channel === "whatsapp" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;

  if (!accountSid || !authToken || !fromAddress) {
    return { status: "queued" as const };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body: input.body,
      from: formatTwilioAddress(input.channel, fromAddress),
      to: formatTwilioAddress(input.channel, input.to),
    });

    return {
      status: "sent" as const,
      externalMessageId: message.sid,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Failed to dispatch outbound message",
    };
  }
}