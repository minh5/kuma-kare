import { verifyJwt } from './lib/jwt';
import { isEmailAllowed } from './lib/allowlist';
import { AnthropicProvider, type ChatMessage } from './lib/llm';
import { buildSystemPrompt } from './lib/careGuide';

export interface WorkerEnv {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  ALLOWED_EMAILS: string;
  BASE_PATH: string;
}

export function createWorkerHandler() {
  return async function handle(
    request: Request,
    env: WorkerEnv,
  ): Promise<Response> {
    const url = new URL(request.url);
    const basePath = env.BASE_PATH || '';
    const path = url.pathname;

    // If a base path is configured, the request must be prefixed with it.
    if (basePath) {
      if (!path.startsWith(basePath)) {
        return new Response('Not Found', { status: 404 });
      }
    }
    const route = path.slice(basePath.length);

    // GET /api/auth/login — redirect to Google OAuth consent screen.
    if (route === '/api/auth/login' && request.method === 'GET') {
      const redirectUri = `${url.origin}${basePath}/api/auth/callback`;
      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      });
      const location = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return new Response(null, {
        status: 302,
        headers: { Location: location },
      });
    }

    // GET /api/auth/callback — exchange code for tokens, issue JWT cookie.
    if (route === '/api/auth/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code', { status: 400 });
      }

      const redirectUri = `${url.origin}${basePath}/api/auth/callback`;
      const tokenParams = new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      let tokenResponse: Response;
      try {
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });
      } catch {
        return new Response('Token exchange failed', { status: 502 });
      }

      if (!tokenResponse.ok) {
        return new Response('Token exchange failed', { status: 502 });
      }

      const tokenData: any = await tokenResponse.json();
      const idToken = tokenData.id_token;
      if (!idToken) {
        return new Response('No id_token', { status: 502 });
      }

      let email: string | undefined;
      try {
        const payloadB64 = idToken.split('.')[1];
        const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const payloadJson = JSON.parse(new TextDecoder().decode(bytes));
        email = payloadJson.email;
      } catch {
        return new Response('Invalid id_token', { status: 502 });
      }

      if (!email || !isEmailAllowed(email, env.ALLOWED_EMAILS)) {
        return new Response('Unauthorized', { status: 403 });
      }

      // Issue a JWT. We sign it ourselves (HS256) using the JWT secret.
      const { signJwt } = await import('./lib/jwt');
      const token = await signJwt({ email }, env.JWT_SECRET, 7 * 24 * 3600);

      const homeUrl = `${url.origin}${basePath}/`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: homeUrl,
          'Set-Cookie': `jwt=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
        },
      });
    }

    // POST /api/chat — authenticated chat with the LLM.
    if (route === '/api/chat' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      const jwtMatch = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
      const token = jwtMatch ? jwtMatch[1] : null;

      if (!token) {
        return new Response('Unauthorized', { status: 401 });
      }

      const payload = await verifyJwt(token, env.JWT_SECRET);
      if (!payload || !payload.email) {
        return new Response('Unauthorized', { status: 401 });
      }

      if (!isEmailAllowed(payload.email, env.ALLOWED_EMAILS)) {
        return new Response('Forbidden', { status: 403 });
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return new Response('Invalid JSON', { status: 400 });
      }

      const messages: ChatMessage[] = Array.isArray(body?.messages)
        ? body.messages
        : [];

      const provider = new AnthropicProvider(env.ANTHROPIC_API_KEY);
      const system = buildSystemPrompt();

      let reply: string;
      try {
        reply = await provider.chat(messages, system);
      } catch (err) {
        return new Response(
          `LLM error: ${err instanceof Error ? err.message : String(err)}`,
          { status: 502 },
        );
      }

      return new Response(JSON.stringify({ content: reply }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  };
}
