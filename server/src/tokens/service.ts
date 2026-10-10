import { pool } from '../db';
import type { TokenPackage } from './packages';
import { totalTokens } from './packages';

/** Records a pending purchase for a freshly-created Stripe Checkout session. */
export async function createPurchase(
  userId: string,
  pkg: TokenPackage,
  stripeSessionId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO token_purchases (user_id, package_id, tokens, amount_cents, currency, stripe_session_id)
     VALUES ($1, $2, $3, $4, 'brl', $5)`,
    [userId, pkg.id, totalTokens(pkg), pkg.priceCents, stripeSessionId]
  );
}

/**
 * Idempotently credits the tokens for a completed Stripe Checkout session.
 * The status guard means the client confirmation and the Stripe webhook can
 * both call this and the tokens are only ever added once. Returns the number
 * of tokens credited (0 when the purchase was already processed or unknown).
 */
export async function creditPurchase(
  stripeSessionId: string
): Promise<{ credited: number; userId: string | null }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{ user_id: string; tokens: number }>(
      `UPDATE token_purchases
         SET status = 'completed', completed_at = now()
       WHERE stripe_session_id = $1 AND status <> 'completed'
       RETURNING user_id, tokens`,
      [stripeSessionId]
    );
    if (result.rowCount === 0) {
      await client.query('COMMIT');
      return { credited: 0, userId: null };
    }
    const { user_id, tokens } = result.rows[0];
    await client.query(`UPDATE users SET tokens = tokens + $1 WHERE id = $2`, [tokens, user_id]);
    await client.query('COMMIT');
    return { credited: tokens, userId: user_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
