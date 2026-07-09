import { verifyJwt } from '../lib/jwt';
import type { Env, JwtPayload } from '../types';

export async function verifyAuth(
  request: Request,
  env: Env,
): Promise<JwtPayload | null> {
  const cookie = request.headers.get('cookie') ?? '';
  const match = /(?:^|;\s*)jwt=([^;]+)/.exec(cookie);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  return verifyJwt(token, env.JWT_SECRET);
}

export function isEmailAllowed(email: string, env: Env): boolean {
  const allowed = env.ALLOWED_EMAILS
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
