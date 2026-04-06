# Payment Webhook Validation

This document describes how incoming webhook requests from Stripe, Paystack, Twilio, and channel partners are authenticated before any payload processing occurs.

## Shared Library

All cryptographic verification is centralised in [`lib/security/webhook-signature.ts`](../../lib/security/webhook-signature.ts).

| Export | Algorithm | Used by |
|---|---|---|
| `verifyStripeSignature` | HMAC-SHA256, Stripe timestamp format | Stripe webhook handler |
| `verifyPaystackSignature` | HMAC-SHA512 | `app/api/paystack/webhook/route.ts` |
| `verifyHmacSha256Signature` | HMAC-SHA256 (generic) | POS webhook, channel webhook |
| `verifyHmacSha512Signature` | HMAC-SHA512 (generic) | Shared utility |

All comparisons use `crypto.timingSafeEqual` to prevent timing-based side-channel attacks.

## Stripe

**Header:** `Stripe-Signature`  
**Format:** `t=<unix_timestamp>,v1=<hex_digest>[,v0=<legacy>]`  
**Algorithm:** HMAC-SHA256 of `"<timestamp>.<rawBody>"` with the endpoint secret.  
**Replay protection:** 5-minute tolerance window on the timestamp.  
**Secret env var:** `STRIPE_WEBHOOK_SECRET`

```ts
import { verifyStripeSignature } from "@/lib/security/webhook-signature";

const rawBody = await request.text();
const sig = request.headers.get("stripe-signature");

if (!verifyStripeSignature(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

## Paystack

**Header:** `x-paystack-signature`  
**Format:** Hex-encoded SHA-512 HMAC digest of the raw request body.  
**Secret env var:** `PAYSTACK_WEBHOOK_SECRET` (falls back to `PAYSTACK_SECRET_KEY`)

```ts
import { verifyPaystackSignature } from "@/lib/security/webhook-signature";

const rawBody = await request.text();
const sig = request.headers.get("x-paystack-signature");
const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;

if (!verifyPaystackSignature(rawBody, sig, secret)) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

## Twilio (SMS / WhatsApp)

Twilio signature validation is handled by the official `twilio` SDK helper `twilio.validateRequest()` inside `app/api/twilio-webhook/route.ts`.  
Secret env var: `TWILIO_AUTH_TOKEN`.

## POS Webhook

Uses `verifyHmacSha256Signature` with secret env var `POS_WEBHOOK_SECRET`.  
See `app/api/pos-webhook/route.ts`.

## Channel Webhooks (Booking.com / Expedia / Airbnb)

`app/api/channel-webhook/[channel]/route.ts` validates the `propertyId` UUID in the payload against the organizations table.  
Per-channel HMAC signature validation should be added when credentials are provisioned for each OTA.

## Testing

Webhook signature tests live in `tests/integration/paystack-callback-verification.test.ts` and cover:

- Valid signature → HTTP 200
- Tampered body → HTTP 401
- Missing signature header → HTTP 401
- Correct algorithm and timing-safe comparison is exercised via unit test in `tests/unit/pms/authorization.test.ts` (generic HMAC verifier)

## Key Rotation

When rotating webhook secrets:

1. Update the secret in the payment provider dashboard.
2. Update the corresponding env var in `.env.local` (dev) and the hosting platform (prod).
3. Re-run `npm run test:integration` to confirm all signature tests still pass.
4. Stripe supports dual-secret rotation; Paystack requires a cutover window.
