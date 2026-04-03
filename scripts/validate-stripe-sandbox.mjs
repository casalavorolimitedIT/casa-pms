import Stripe from "stripe";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

async function run() {
  const secretKey = requiredEnv("STRIPE_SECRET_KEY");
  const stripe = new Stripe(secretKey);

  const runId = `m02-${Date.now()}`;
  const setupAmountMinor = Number(process.env.STRIPE_SANDBOX_CAPTURE_AMOUNT_MINOR ?? 5000);
  const refundAmountMinor = Number(process.env.STRIPE_SANDBOX_REFUND_AMOUNT_MINOR ?? 1000);
  const currency = (process.env.STRIPE_SANDBOX_CURRENCY ?? "usd").toLowerCase();

  const setupIntent = await stripe.setupIntents.create({
    payment_method: "pm_card_visa",
    confirm: true,
    usage: "off_session",
    metadata: {
      run_id: runId,
      purpose: "m02_setup_validation",
    },
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: setupAmountMinor,
    currency,
    payment_method: "pm_card_visa",
    confirm: true,
    capture_method: "manual",
    metadata: {
      run_id: runId,
      purpose: "m02_capture_validation",
    },
  });

  const capturedIntent = await stripe.paymentIntents.capture(paymentIntent.id);

  const chargeId = typeof capturedIntent.latest_charge === "string"
    ? capturedIntent.latest_charge
    : capturedIntent.latest_charge?.id;

  if (!chargeId) {
    throw new Error("No charge id found after capture; cannot execute refund validation.");
  }

  const refund = await stripe.refunds.create({
    charge: chargeId,
    amount: Math.min(refundAmountMinor, capturedIntent.amount_received ?? setupAmountMinor),
    metadata: {
      run_id: runId,
      purpose: "m02_refund_validation",
    },
  });

  const report = {
    at: nowIso(),
    runId,
    setup: {
      intentId: setupIntent.id,
      status: setupIntent.status,
      paymentMethod: setupIntent.payment_method,
    },
    capture: {
      intentId: capturedIntent.id,
      status: capturedIntent.status,
      amount: capturedIntent.amount,
      amountReceived: capturedIntent.amount_received,
      currency: capturedIntent.currency?.toUpperCase(),
      chargeId,
    },
    refund: {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency?.toUpperCase(),
      chargeId: String(refund.charge ?? ""),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error("Stripe sandbox validation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
