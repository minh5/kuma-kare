import { SignJWT, jwtVerify } from 'jose';

const enc = (secret: string): Uint8Array =>
  new TextEncoder().encode(secret);

export interface JwtPayload {
  email: string;
  exp?: number;
}

export async function signJwt(
  email: string,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(enc(secret));
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, enc(secret), {
      algorithms: ['HS256'],
    });
    if (typeof payload.email !== 'string') return null;
    return { email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}
