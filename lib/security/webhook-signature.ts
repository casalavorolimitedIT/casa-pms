import crypto from "node:crypto";

export function verifyHmacSha256Signature(payload: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return safeCompareHex(digest, signature);
}

export function verifyHmacSha512Signature(payload: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  return safeCompareHex(digest, signature);
}

/**
 * Verifies a Stripe webhook signature header.
 *
 * Stripe sends: `Stripe-Signature: t=<timestamp>,v1=<hex_digest>[,v0=<legacy>]`
 * The signed payload is: `<t>.<rawBody>`
 * Algorithm: HMAC-SHA256 with the webhook endpoint secret.
 *
 * A 5-minute tolerance window is enforced to mitigate replay attacks.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  toleranceSeconds = 300,
): boolean {
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));

  if (!tPart || v1Parts.length === 0) return false;

  const timestamp = tPart.slice(2);
  const tsSeconds = parseInt(timestamp, 10);
  if (!Number.isFinite(tsSeconds)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedDigest = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return v1Parts.some((v1) => safeCompareHex(expectedDigest, v1.slice(3)));
}

/**
 * Verifies a Paystack webhook signature header.
 *
 * Paystack sends: `x-paystack-signature: <sha512_hex_digest>`
 * Algorithm: HMAC-SHA512 of the raw request body with the secret key.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  return verifyHmacSha512Signature(rawBody, signatureHeader, secret);
}

function safeCompareHex(a: string, b: string) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
