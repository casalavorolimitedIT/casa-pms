import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyPaystackSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) {
    return false;
  }

  const digest = crypto
    .createHmac("sha512", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // TODO(M02): Persist webhook event and apply idempotent payment state transitions.
  return NextResponse.json({ ok: true });
}
