import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db';
import { verifyToken } from './tokens';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
  tokens: number;
  rating: number;
  wins: number;
  losses: number;
  games_played: number;
}

export interface AuthedRequest extends Request {
  user?: UserRow;
}

/** Public shape of a user returned by the API. */
export function toUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
    tokens: row.tokens,
    rating: row.rating,
    wins: row.wins,
    losses: row.losses,
    gamesPlayed: row.games_played,
  };
}

/** Bearer-token guard: attaches the current user row to `req.user`. */
export async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? verifyToken(token) : null;
  if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

  try {
    const result = await pool.query<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Não autenticado.' });
    req.user = row;
    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('auth lookup failed', err);
    res.status(500).json({ error: 'Erro de autenticação.' });
  }
}
