import { verifyJWT, type JWTPayload } from '../lib/jwt';

/**
 * Extracts and validates a JWT from the `jwt` cookie on the request.
 * Returns the email claim if valid, otherwise null.
 */
export async function verifyAuth(
  request: Request,
  secret: string,
): Promise<string | null> {
  const cookieHeader = request.headers.get('Cookie') || request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split('=');
    if (name === 'jwt') {
      const token = rest.join('=');
      const payload: JWTPayload | null = await verifyJWT(token, secret);
      if (payload && payload.email) {
        return payload.email;
      }
      return null;
    }
  }

  return null;
}
