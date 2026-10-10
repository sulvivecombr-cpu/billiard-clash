import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@pool/shared';
import { getToken } from '../utils/session';

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket'],
      // Sent on every (re)connect so the server can identify the signed-in
      // player; read lazily so a login/logout is picked up on reconnect.
      auth: (cb) => cb({ token: getToken() }),
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Session info persisted so a page refresh can attempt to rejoin the same match. */
export interface MultiplayerSession {
  roomCode: string;
  playerId: string;
}

const SESSION_KEY = 'pool.session.v1';

export function saveSession(session: MultiplayerSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): MultiplayerSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
