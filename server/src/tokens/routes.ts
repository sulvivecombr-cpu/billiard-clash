import { Router } from 'express';
import { pool } from '../db';
import { authenticate, type AuthedRequest } from '../auth/middleware';
import { TOKEN_PACKAGES, findPackage, totalTokens } from './packages';
import { getStripe, isStripeConfigured } from './stripe';
import { createPurchase, creditPurchase } from './service';

export const tokensRouter = Router();

const CLIENT_URL = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

/** Public catalogue for the store screen. */
tokensRouter.get('/packages', (_req, res) => {
  res.json({
    configured: isStripeConfigured(),
    packages: TOKEN_PACKAGES.map((pkg) => ({ ...pkg, totalTokens: totalTokens(pkg) })),
  });
});

tokensRouter.get('/balance', authenticate, (req: AuthedRequest, res) => {
  res.json({ tokens: req.user!.tokens });
});

/** Opens a Stripe Checkout session for the chosen package and returns its URL. */
tokensRouter.post('/checkout', authenticate, async (req: AuthedRequest, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Pagamentos ainda não estão configurados.' });
  }

  const pkg = findPackage(String(req.body?.packageId ?? ''));
  if (!pkg) return res.status(400).json({ error: 'Pacote de fichas inválido.' });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: pkg.priceCents,
            product_data: { name: `${pkg.name} — ${totalTokens(pkg)} fichas` },
          },
        },
      ],
      metadata: { userId: req.user!.id, packageId: pkg.id },
      success_url: `${CLIENT_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/?checkout=cancel`,
    });

    await createPurchase(req.user!.id, pkg, session.id);
    return res.json({ url: session.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('checkout creation failed', err);
    return res.status(500).json({ error: 'Não foi possível iniciar o pagamento.' });
  }
});

/**
 * Confirms a purchase when the player returns from Stripe Checkout. Verifies
 * the session with Stripe (and that it belongs to this user) before crediting.
 */
tokensRouter.post('/confirm', authenticate, async (req: AuthedRequest, res) => {
  const sessionId = String(req.body?.sessionId ?? '');
  if (!sessionId) return res.status(400).json({ error: 'Sessão de pagamento ausente.' });
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Pagamentos ainda não estão configurados.' });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Sessão de pagamento inválida.' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(409).json({ error: 'O pagamento ainda não foi confirmado.' });
    }

    const { credited } = await creditPurchase(session.id);
    const balance = await pool.query<{ tokens: number }>(`SELECT tokens FROM users WHERE id = $1`, [req.user!.id]);
    return res.json({ credited, tokens: balance.rows[0]?.tokens ?? req.user!.tokens });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('checkout confirmation failed', err);
    return res.status(500).json({ error: 'Não foi possível confirmar a compra.' });
  }
});
