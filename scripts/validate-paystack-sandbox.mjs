function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function paystackRequest(path, init = {}) {
  const secretKey = requiredEnv("PAYSTACK_SECRET_KEY");
  const baseUrl = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Paystack request failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function run() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const email = process.env.PAYSTACK_SANDBOX_EMAIL ?? "test@example.com";
  const amountMinor = Number(process.env.PAYSTACK_SANDBOX_AMOUNT_MINOR ?? 5000);
  const currency = (process.env.PAYSTACK_SANDBOX_CURRENCY ?? "NGN").toUpperCase();
  const reference = process.env.PAYSTACK_SANDBOX_REFERENCE ?? `m02-paystack-${Date.now()}`;

  const initialize = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      amount: amountMinor,
      email,
      currency,
      callback_url: `${appUrl}/dashboard/front-desk/check-out/sandbox`,
      reference,
    }),
  });

  const verifyReference = process.env.PAYSTACK_SANDBOX_VERIFY_REFERENCE ?? reference;
  let verify = null;
  try {
    verify = await paystackRequest(`/transaction/verify/${encodeURIComponent(verifyReference)}`, {
      method: "GET",
    });
  } catch (err) {
    verify = {
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
      note: "Complete hosted test checkout first, then rerun with PAYSTACK_SANDBOX_VERIFY_REFERENCE=<reference>",
    };
  }

  const report = {
    at: new Date().toISOString(),
    initialize: {
      status: initialize?.status,
      message: initialize?.message,
      reference: initialize?.data?.reference,
      authorizationUrl: initialize?.data?.authorization_url,
      accessCode: initialize?.data?.access_code,
    },
    verify,
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error("Paystack sandbox validation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
