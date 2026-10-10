import { API_BASE, apiRequest, getToken, setToken } from './session';
import { disconnectSocket } from '../multiplayer/SocketClient';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  tokens: number;
  rating: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export { getToken };

export async function register(email: string, password: string, displayName: string): Promise<AuthUser> {
  const data = await apiRequest<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setToken(data.token);
  disconnectSocket(); // reconnect so the socket carries the new identity
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiRequest<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  disconnectSocket();
  return data.user;
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const data = await apiRequest<{ user: AuthUser }>('/api/auth/me');
    return data.user;
  } catch {
    setToken(null);
    return null;
  }
}

export async function updateProfile(displayName: string): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
  return data.user;
}

export function logout(): void {
  setToken(null);
  disconnectSocket();
}

export { API_BASE };
