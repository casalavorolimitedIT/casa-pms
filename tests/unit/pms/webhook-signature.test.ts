import crypto from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  verifyHmacSha256Signature,
  verifyHmacSha512Signature,
  verifyStripeSignature,
  verifyPaystackSignature,
} from "../../../lib/security/webhook-signature.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hmacSha256Hex(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function hmacSha512Hex(payload: string, secret: string): string {
  return crypto.createHmac("sha512", secret).update(payload).digest("hex");
}

// ─── verifyHmacSha256Signature ────────────────────────────────────────────────

describe("verifyHmacSha256Signature", () => {
  const secret = "test-secret-sha256";
  const payload = JSON.stringify({ event: "charge.created", amount: 5000 });

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const sig = hmacSha256Hex(payload, secret);
    assert.ok(verifyHmacSha256Signature(payload, sig, secret));
  });

  it("returns false for a tampered payload", () => {
    const sig = hmacSha256Hex(payload, secret);
    const tampered = payload + " ";
    assert.equal(verifyHmacSha256Signature(tampered, sig, secret), false);
  });

  it("returns false when signature is null", () => {
    assert.equal(verifyHmacSha256Signature(payload, null, secret), false);
  });

  it("returns false when secret is undefined", () => {
    const sig = hmacSha256Hex(payload, secret);
    assert.equal(verifyHmacSha256Signature(payload, sig, undefined), false);
  });

  it("returns false for a wrong secret", () => {
    const sig = hmacSha256Hex(payload, "wrong-secret");
    assert.equal(verifyHmacSha256Signature(payload, sig, secret), false);
  });
});

// ─── verifyHmacSha512Signature ────────────────────────────────────────────────

describe("verifyHmacSha512Signature", () => {
  const secret = "test-secret-sha512";
  const payload = JSON.stringify({ event: "payment.success" });

  it("returns true for a valid HMAC-SHA512 signature", () => {
    const sig = hmacSha512Hex(payload, secret);
    assert.ok(verifyHmacSha512Signature(payload, sig, secret));
  });

  it("returns false for a tampered payload", () => {
    const sig = hmacSha512Hex(payload, secret);
    assert.equal(verifyHmacSha512Signature(payload + "x", sig, secret), false);
  });

  it("returns false when signature is empty string", () => {
    assert.equal(verifyHmacSha512Signature(payload, "", secret), false);
  });
});

// ─── verifyStripeSignature ────────────────────────────────────────────────────

function buildStripeHeader(payload: string, secret: string, timestampOverride?: number): string {
  const ts = timestampOverride ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${ts},v1=${digest}`;
}

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_stripe_secret";
  const payload = JSON.stringify({ type: "payment_intent.succeeded" });

  it("returns true for a valid Stripe signature header within tolerance", () => {
    const header = buildStripeHeader(payload, secret);
    assert.ok(verifyStripeSignature(payload, header, secret));
  });

  it("returns false for a tampered payload", () => {
    const header = buildStripeHeader(payload, secret);
    assert.equal(verifyStripeSignature(payload + "tamper", header, secret), false);
  });

  it("returns false when the timestamp is outside the 5-minute tolerance", () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400; // 400 s ago → outside 300 s window
    const header = buildStripeHeader(payload, secret, oldTs);
    assert.equal(verifyStripeSignature(payload, header, secret), false);
  });

  it("accepts custom tolerance", () => {
    const oldTs = Math.floor(Date.now() / 1000) - 350;
    const header = buildStripeHeader(payload, secret, oldTs);
    // With 600 s tolerance it should pass
    assert.ok(verifyStripeSignature(payload, header, secret, 600));
  });

  it("returns false when header is null", () => {
    assert.equal(verifyStripeSignature(payload, null, secret), false);
  });

  it("returns false when secret is undefined", () => {
    const header = buildStripeHeader(payload, secret);
    assert.equal(verifyStripeSignature(payload, header, undefined), false);
  });

  it("returns false when header has no v1= component", () => {
    const ts = Math.floor(Date.now() / 1000);
    assert.equal(verifyStripeSignature(payload, `t=${ts}`, secret), false);
  });

  it("returns false when header has no t= component", () => {
    const digest = hmacSha256Hex(`0.${payload}`, secret);
    assert.equal(verifyStripeSignature(payload, `v1=${digest}`, secret), false);
  });
});

// ─── verifyPaystackSignature ──────────────────────────────────────────────────

describe("verifyPaystackSignature", () => {
  const secret = "sk_test_paystack_secret";
  const payload = JSON.stringify({ event: "charge.success", data: { amount: 100000 } });

  it("returns true for a valid Paystack x-paystack-signature", () => {
    const sig = hmacSha512Hex(payload, secret);
    assert.ok(verifyPaystackSignature(payload, sig, secret));
  });

  it("returns false for a tampered payload", () => {
    const sig = hmacSha512Hex(payload, secret);
    assert.equal(verifyPaystackSignature(payload + "x", sig, secret), false);
  });

  it("returns false for a null signature", () => {
    assert.equal(verifyPaystackSignature(payload, null, secret), false);
  });

  it("returns false for an undefined secret (misconfigured env)", () => {
    const sig = hmacSha512Hex(payload, secret);
    assert.equal(verifyPaystackSignature(payload, sig, undefined), false);
  });
});
