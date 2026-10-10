/**
 * Auth token storage, kept in its own module so the socket client can read it
 * without importing the whole auth API (which itself needs the socket client
 * to reconnect on login/logout).
 */
const TOKEN_KEY = 'pool.auth.token.v1';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // LocalStorage unavailable — auth simply won't persist across reloads.
  }
}

/** Base URL of the Express/Socket.IO server, shared by the REST calls. */
export const API_BASE = ((import.meta as any).env?.VITE_SERVER_URL as string) || 'http://localhost:3001';

/** Small JSON fetch helper with the Bearer token attached. */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(data?.error ?? 'Falha na conexão com o servidor.');
  return data as T;
}
