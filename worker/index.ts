import type { Env } from './types';
import { basePath, joinBase } from './lib/http';
import { verifyAuth } from './middleware/verifyAuth';
import { handleAuthLogin } from './handlers/authLogin';
import { handleAuthCallback } from './handlers/authCallback';
import { handleChat } from './handlers/chat';
import { handleContacts } from './handlers/contacts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const base = basePath(env);
    const url = new URL(request.url);
    const path = url.pathname;

    // Normalize: strip base prefix for routing comparisons.
    const route = base && path.startsWith(base) ? path.slice(base.length) : path;
    const normalized = route.startsWith('/') ? route : '/' + route;

    // CORS preflight for API routes (helps local dev).
    if (request.method === 'OPTIONS' && normalized.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
    }

    // ---- Auth routes (no JWT required) ----
    if (normalized === '/api/auth/login' && request.method === 'GET') {
      return handleAuthLogin(request, env);
    }
    if (normalized === '/api/auth/callback' && request.method === 'GET') {
      return handleAuthCallback(request, env);
    }

    // ---- Authenticated API routes ----
    if (normalized === '/api/chat' && request.method === 'POST') {
      const auth = await verifyAuth(request, env);
      if (!auth) {
        return json({ error: 'Unauthorized.' }, 401);
      }
      return handleChat(request, env, auth);
    }

    if (normalized === '/api/contacts' && request.method === 'GET') {
      const auth = await verifyAuth(request, env);
      if (!auth) {
        return json({ error: 'Unauthorized.' }, 401);
      }
      return handleContacts(request, env, auth);
    }

    // ---- Fallback ----
    return json(
      { error: 'Not found.', path: joinBase(env, normalized) },
      404,
    );
  },
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
