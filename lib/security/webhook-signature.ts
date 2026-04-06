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

function safeCompareHex(a: string, b: string) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
