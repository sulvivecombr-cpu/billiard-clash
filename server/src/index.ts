import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@pool/shared';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './sockets/handlers';
import { authRouter } from './auth/routes';
import { isAuthConfigured, verifyToken } from './auth/tokens';
import { ensureSchema, pool } from './db';
import { tokensRouter } from './tokens/routes';
import { stripeWebhookHandler } from './tokens/webhook';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

// Stripe needs the raw body to verify the webhook signature — mounted before
// the JSON parser so the bytes are untouched.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/tokens', tokensRouter);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

// Attaches the signed-in player's account (name + rating) to the socket, so
// online matches can use their real identity and award ranking points. Guests
// connect without a token and play unranked.
io.use(async (socket, next) => {
  const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
  const userId = token ? verifyToken(String(token)) : null;
  if (!userId) return next();

  try {
    const result = await pool.query<{ id: string; display_name: string; rating: number }>(
      `SELECT id, display_name, rating FROM users WHERE id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (row) {
      socket.data.user = { id: row.id, displayName: row.display_name, rating: row.rating };
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('socket auth lookup failed', err);
  }
  next();
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

async function start(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!isAuthConfigured()) {
    throw new Error('JWT_SECRET is not set');
  }
  await ensureSchema();
  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Classic 8-Ball Pool server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Server failed to start:', err);
  process.exit(1);
});
