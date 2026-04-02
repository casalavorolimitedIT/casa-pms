const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function getStripeConfig() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  if (!stripePublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable",
    );
  }

  return {
    secretKey: stripeSecretKey,
    publishableKey: stripePublishableKey,
  };
}
