export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

const TOKEN_KEY = 'pool.auth.token.v1';
const API_BASE = ((import.meta as any).env?.VITE_SERVER_URL as string) || 'http://localhost:3001';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // LocalStorage unavailable — auth simply won't persist across reloads.
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export async function register(email: string, password: string, displayName: string): Promise<AuthUser> {
  const data = await request<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const data = await request<{ user: AuthUser }>('/api/auth/me');
    return data.user;
  } catch {
    setToken(null);
    return null;
  }
}

export async function updateProfile(displayName: string): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
  return data.user;
}

export function logout(): void {
  setToken(null);
}
