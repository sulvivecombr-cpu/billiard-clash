import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Welcome balance every new account starts with. */
export const STARTING_TOKENS = 1000;

/** Creates the tables the server needs if they don't already exist. */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Profile/ranking/token columns — added separately so existing databases
  // pick them up without a migration step.
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS tokens INTEGER NOT NULL DEFAULT ${STARTING_TOKENS},
      ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 1000,
      ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0
  `);

  // One row per token purchase. Created as 'pending' when the Stripe Checkout
  // session is opened and flipped to 'completed' (crediting the tokens) exactly
  // once — the unique stripe_session_id plus the status guard make crediting
  // idempotent across the client confirmation and the webhook.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'brl',
      stripe_session_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ
    )
  `);
}
