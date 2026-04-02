import { GatewayRoutingInput, PaymentGateway } from "@/lib/payments/types";

const NGN_CURRENCY = "NGN";

export function resolvePaymentGateway(input: GatewayRoutingInput): PaymentGateway {
  if (input.preferredGateway) {
    return input.preferredGateway;
  }

  // Default rule: Naira payments route through Paystack.
  if (input.currency.toUpperCase() === NGN_CURRENCY) {
    return "paystack";
  }

  return "stripe";
}
