import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from './stripe';
import { creditPurchase } from './service';

/**
 * Stripe webhook receiver. Mounted with `express.raw()` so the signature can
 * be verified against the untouched request body. Signature verification is
 * mandatory: without STRIPE_WEBHOOK_SECRET the endpoint refuses to run rather
 * than trusting unsigned requests.
 */
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret) {
    res.status(503).json({ error: 'Webhook não configurado.' });
    return;
  }

  let event: Stripe.Event;
  try {
    const signature = req.headers['stripe-signature'];
    event = getStripe().webhooks.constructEvent(req.body, signature as string, secret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('stripe webhook signature verification failed', err);
    res.status(400).json({ error: 'Assinatura inválida.' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await creditPurchase(session.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('stripe webhook crediting failed', err);
      res.status(500).json({ error: 'Falha ao creditar fichas.' });
      return;
    }
  }

  res.json({ received: true });
}
