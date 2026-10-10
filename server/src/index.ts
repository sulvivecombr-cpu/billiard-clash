import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@pool/shared';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './sockets/handlers';
import { authRouter } from './auth/routes';
import { isAuthConfigured } from './auth/tokens';
import { ensureSchema } from './db';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
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
