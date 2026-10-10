import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64;

/** Hashes a password with a random salt, returned as "salt:hash" (both hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const candidate = scryptSync(password, salt, KEYLEN);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
