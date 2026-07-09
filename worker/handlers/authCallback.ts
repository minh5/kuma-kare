import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { Env } from '../types';
import { signJwt } from '../lib/jwt';
import { isEmailAllowed } from '../middleware/verifyAuth';
import {
  redirectUri,
  basePath,
  buildCookie,
  getCookie,
  joinBase,
  appendCookies,
} from '../lib/http';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);

interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface IdTokenPayload {
  email?: string;
  email_verified?: boolean;
  aud?: string;
}

export async function handleAuthCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookiePath = basePath(env) || '/';
  const clearAuthCookies = [
    buildCookie('pkce_verifier', '', { path: cookiePath, maxAge: 0 }),
    buildCookie('oauth_state', '', { path: cookiePath, maxAge: 0 }),
  ];

  if (error) {
    return forbidden(`OAuth error: ${error}`, clearAuthCookies);
  }
  if (!code) {
    return text('Missing authorization code', 400);
  }

  const expectedState = getCookie(request, 'oauth_state');
  const verifier = getCookie(request, 'pkce_verifier');
  if (!expectedState || !verifier || state !== expectedState) {
    return text('Invalid OAuth state', 400, clearAuthCookies);
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(env, request),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const body = (await tokenRes.json().catch(() => ({}))) as GoogleTokenResponse;
    return text(
      `Token exchange failed: ${body.error_description ?? body.error ?? tokenRes.status}`,
      502,
      clearAuthCookies,
    );
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;
  const idToken = tokens.id_token;
  if (!idToken) {
    return text('No id_token in token response', 502, clearAuthCookies);
  }

  let payload: IdTokenPayload;
  try {
    const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = verified.payload as unknown as IdTokenPayload;
  } catch {
    return text('Invalid id_token signature', 401, clearAuthCookies);
  }

  const email = payload.email ?? '';
  if (!payload.email_verified || !email) {
    return text('Email not verified by Google', 403, clearAuthCookies);
  }

  if (!isEmailAllowed(email, env)) {
    return forbidden(
      'Your email is not on the caretaker allowlist.',
      clearAuthCookies,
    );
  }

  const jwt = await signJwt(email, env.JWT_SECRET, 3600);
  const jwtCookie = buildCookie('jwt', jwt, {
    path: cookiePath,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 3600,
  });

  const headers = new Headers({ location: joinBase(env, '/chat') });
  appendCookies(headers, [jwtCookie, ...clearAuthCookies]);
  return new Response(null, { status: 302, headers });
}

function text(
  message: string,
  status: number,
  cookies?: string[],
): Response {
  const headers = new Headers({ 'content-type': 'text/plain; charset=utf-8' });
  if (cookies) appendCookies(headers, cookies);
  return new Response(message, { status, headers });
}

function forbidden(message: string, cookies?: string[]): Response {
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  if (cookies) appendCookies(headers, cookies);
  return new Response(
    `<!doctype html><meta charset="utf-8"><h2>Access denied</h2><p>${message}</p>`,
    { status: 403, headers },
  );
}
