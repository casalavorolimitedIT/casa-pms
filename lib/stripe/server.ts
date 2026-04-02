import Stripe from "stripe";
import { getStripeConfig } from "@/lib/stripe/config";
import { PaymentInitializeInput, PaymentInitializeResult } from "@/lib/payments/types";

export function getStripeServerClient() {
  const { secretKey } = getStripeConfig();
  return new Stripe(secretKey);
}

export async function initializeStripePayment(
  input: PaymentInitializeInput,
): Promise<PaymentInitializeResult> {
  const stripe = getStripeServerClient();

  const intent = await stripe.paymentIntents.create({
    amount: input.amountMinor,
    currency: input.currency.toLowerCase(),
    receipt_email: input.email,
    metadata: {
      reference: input.reference,
    },
  });

  return {
    authorizationUrl: input.callbackUrl,
    reference: intent.id,
  };
}

export async function verifyStripePayment(reference: string) {
  const stripe = getStripeServerClient();
  const intent = await stripe.paymentIntents.retrieve(reference);

  return {
    reference: intent.id,
    status: intent.status,
    amount: intent.amount,
    currency: intent.currency.toUpperCase(),
  };
}
