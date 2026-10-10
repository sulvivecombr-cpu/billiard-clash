import { Router } from 'express';
import { pool } from '../db';
import { hashPassword, verifyPassword } from './passwords';
import { signToken } from './tokens';
import { authenticate, toUser, type AuthedRequest, type UserRow } from './middleware';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const displayName = String(req.body?.displayName ?? '').trim();

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }
  if (displayName.length < 2 || displayName.length > 24) {
    return res.status(400).json({ error: 'O nome deve ter entre 2 e 24 caracteres.' });
  }

  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, hashPassword(password), displayName]
    );
    const row = result.rows[0];
    return res.status(201).json({ token: signToken(row.id), user: toUser(row) });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    }
    // eslint-disable-next-line no-console
    console.error('register failed', err);
    return res.status(500).json({ error: 'Não foi possível criar a conta.' });
  }
});

authRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  try {
    const result = await pool.query<UserRow>(`SELECT * FROM users WHERE email = $1`, [email]);
    const row = result.rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    return res.json({ token: signToken(row.id), user: toUser(row) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('login failed', err);
    return res.status(500).json({ error: 'Não foi possível entrar.' });
  }
});

authRouter.get('/me', authenticate, (req: AuthedRequest, res) => {
  res.json({ user: toUser(req.user!) });
});

authRouter.patch('/profile', authenticate, async (req: AuthedRequest, res) => {
  const displayName = String(req.body?.displayName ?? '').trim();
  if (displayName.length < 2 || displayName.length > 24) {
    return res.status(400).json({ error: 'O nome deve ter entre 2 e 24 caracteres.' });
  }
  try {
    const result = await pool.query<UserRow>(
      `UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *`,
      [displayName, req.user!.id]
    );
    return res.json({ user: toUser(result.rows[0]) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('profile update failed', err);
    return res.status(500).json({ error: 'Não foi possível salvar o perfil.' });
  }
});
