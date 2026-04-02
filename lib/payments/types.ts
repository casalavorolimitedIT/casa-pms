export type CurrencyCode = string;

export type PaymentGateway = "stripe" | "paystack";

export interface GatewayRoutingInput {
  currency: CurrencyCode;
  preferredGateway?: PaymentGateway;
}

export interface PaymentInitializeInput {
  amountMinor: number;
  currency: CurrencyCode;
  email: string;
  callbackUrl: string;
  reference: string;
}

export interface PaymentInitializeResult {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
}
