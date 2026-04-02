import { resolvePaymentGateway } from "@/lib/payments/gateway-router";
import { PaymentInitializeInput, PaymentInitializeResult } from "@/lib/payments/types";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/lib/paystack/server";
import { initializeStripePayment, verifyStripePayment } from "@/lib/stripe/server";

export async function initializePayment(
  input: PaymentInitializeInput,
): Promise<PaymentInitializeResult> {
  const gateway = resolvePaymentGateway({ currency: input.currency });

  if (gateway === "paystack") {
    return initializePaystackTransaction(input);
  }

  return initializeStripePayment(input);
}

export async function verifyPayment(input: {
  currency: string;
  reference: string;
}) {
  const gateway = resolvePaymentGateway({ currency: input.currency });

  if (gateway === "paystack") {
    return verifyPaystackTransaction(input.reference);
  }

  return verifyStripePayment(input.reference);
}
