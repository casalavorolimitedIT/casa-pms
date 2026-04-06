import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/security/webhook-signature";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;

  if (!verifyPaystackSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // TODO(M02): Persist webhook event and apply idempotent payment state transitions.
  return NextResponse.json({ ok: true });
}
