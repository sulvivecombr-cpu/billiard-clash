import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? '';
const EXPIRES_IN = '30d';

export function isAuthConfigured(): boolean {
  return SECRET.length > 0;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET);
    if (typeof payload === 'object' && payload.sub) return String(payload.sub);
    return null;
  } catch {
    return null;
  }
}
