import { getPaystackConfig } from "@/lib/paystack/config";
import { PaymentInitializeInput, PaymentInitializeResult } from "@/lib/payments/types";

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { secretKey, baseUrl } = getPaystackConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paystack request failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as T;
}

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
  };
};

export async function initializePaystackTransaction(
  input: PaymentInitializeInput,
): Promise<PaymentInitializeResult> {
  const result = await paystackRequest<PaystackInitializeResponse>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountMinor,
        email: input.email,
        currency: input.currency,
        callback_url: input.callbackUrl,
        reference: input.reference,
      }),
    },
  );

  if (!result.status) {
    throw new Error(`Paystack initialize failed: ${result.message}`);
  }

  return {
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
    reference: result.data.reference,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const result = await paystackRequest<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );

  if (!result.status) {
    throw new Error(`Paystack verify failed: ${result.message}`);
  }

  return result.data;
}
