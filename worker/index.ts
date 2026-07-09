import { verifyAuth } from './middleware/verifyAuth';
import { signJWT } from './lib/jwt';
import { AnthropicProvider } from './lib/llm';
import { getCareGuide, getEmergencyContacts } from './lib/careGuide';

export interface Env {
  JWT_SECRET: string;
  ALLOWED_EMAILS: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

const SYSTEM_PROMPT =
  'You are Kuma, a helpful AI cat care companion. Answer questions about cat care concisely.';

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function redirect(url: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: url } });
}

/**
 * Main Worker fetch handler. Pure function: takes a Request + Env, returns a Response.
 * Used both by the Cloudflare Worker runtime and the Vite dev middleware.
 */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  // ---- Auth: login (redirect to Google OAuth) ----
  if (pathname === '/api/auth/login' && request.method === 'GET') {
    const clientId = env.GOOGLE_CLIENT_ID || 'stub-client-id';
    const redirectUri =
      env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/callback`;
    const state = crypto.randomUUID();
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&state=${encodeURIComponent(state)}`;
    return redirect(googleAuthUrl, 302);
  }

  // ---- Auth: callback ----
  if (pathname === '/api/auth/callback' && request.method === 'GET') {
    const code = url.searchParams.get('code');
    if (!code) {
      return json({ error: 'missing_code' }, 400);
    }
    // In a full implementation we would exchange the code for tokens with Google.
    // For the stub/dev environment, return an error indicating token exchange is not configured.
    return json({ error: 'oauth_exchange_not_configured' }, 401);
  }

  // ---- Chat (requires auth) ----
  if (pathname === '/api/chat' && request.method === 'POST') {
    const email = await verifyAuth(request, env.JWT_SECRET || 'dev-secret-key-at-least-32-bytes-long-xx');
    if (!email) {
      return json({ error: 'unauthorized' }, 401);
    }

    let body: { messages?: Array<{ role: string; content: string }> };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const messages = (body.messages || []).filter(
      (m) => m && typeof m.content === 'string',
    );

    if (env.ANTHROPIC_API_KEY) {
      try {
        const provider = new AnthropicProvider(env.ANTHROPIC_API_KEY);
        const response = await provider.chat(
          messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          SYSTEM_PROMPT,
        );
        return json({ response });
      } catch {
        return json({ response: 'Sorry, something went wrong.' });
      }
    }

    // No API key configured (dev/stub) — return a canned response.
    return json({ response: 'This is a stub response from the Kuma worker.' });
  }

  // ---- Contacts (requires auth) ----
  if (pathname === '/api/contacts' && request.method === 'GET') {
    const email = await verifyAuth(request, env.JWT_SECRET || 'dev-secret-key-at-least-32-bytes-long-xx');
    if (!email) {
      return json({ error: 'unauthorized' }, 401);
    }
    return json({ contacts: getEmergencyContacts(), guide: getCareGuide() });
  }

  // ---- Health check ----
  if (pathname === '/api/health' && request.method === 'GET') {
    return json({ status: 'ok' });
  }

  return json({ error: 'not_found' }, 404);
}

/**
 * Helper to mint a JWT for a given email (used in tests / dev tooling).
 */
export async function createAuthToken(email: string, secret: string): Promise<string> {
  return signJWT({ email }, secret, 60 * 60 * 24 * 7);
}

/**
 * Cloudflare Worker default export.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
