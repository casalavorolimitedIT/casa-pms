const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

export function getPaystackConfig() {
  if (!paystackSecretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  }

  if (!paystackPublicKey) {
    throw new Error("Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY environment variable");
  }

  return {
    secretKey: paystackSecretKey,
    publicKey: paystackPublicKey,
    baseUrl: "https://api.paystack.co",
  };
}
