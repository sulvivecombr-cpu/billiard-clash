import Stripe from 'stripe';

let client: Stripe | null = null;

/** True when the Stripe secret key is present. The app boots without it — only the store needs it. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Lazily-created Stripe client. Throws when the key is missing. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  if (!client) client = new Stripe(key);
  return client;
}
