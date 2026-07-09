import type { Env } from '../types';
import {
  redirectUri,
  buildCookie,
  randomBase64Url,
  sha256Base64Url,
  basePath,
} from '../lib/http';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = 'openid email';

export async function handleAuthLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response('GOOGLE_CLIENT_ID is not configured', { status: 500 });
  }

  const verifier = randomBase64Url(32);
  const challenge = await sha256Base64Url(verifier);
  const state = randomBase64Url(16);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(env, request),
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const location = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  const cookiePath = basePath(env) || '/';
  const headers = new Headers({ location });
  headers.append(
    'set-cookie',
    buildCookie('pkce_verifier', verifier, {
      path: cookiePath,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600,
    }),
  );
  headers.append(
    'set-cookie',
    buildCookie('oauth_state', state, {
      path: cookiePath,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600,
    }),
  );

  return new Response(null, { status: 302, headers });
}
