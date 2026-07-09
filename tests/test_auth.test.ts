import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../worker/index';
import { signJwt } from '../worker/lib/jwt';
import { isEmailAllowed } from '../worker/middleware/verifyAuth';
import { buildCookie, basePath } from '../worker/lib/http';
import { handleAuthLogin } from '../worker/handlers/authLogin';
import type { Env } from '../worker/types';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    JWT_SECRET: 'test-secret-key-at-least-32-bytes-long',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    ALLOWED_EMAILS: 'caretaker@example.com,friend@example.com',
    BASE_PATH: '/kuma',
    ...overrides,
  };
}

describe('Auth: allowlist', () => {
  const env = makeEnv();
  it('allows listed email (case-insensitive)', () => {
    expect(isEmailAllowed('Caretaker@example.com', env)).toBe(true);
  });
  it('rejects unlisted email', () => {
    expect(isEmailAllowed('stranger@example.com', env)).toBe(false);
  });
  it('rejects empty email', () => {
    expect(isEmailAllowed('', env)).toBe(false);
  });
});

describe('Auth: cookie attributes', () => {
  it('builds jwt cookie with HttpOnly, Secure, SameSite=Lax, Path=BASE_PATH', () => {
    const cookie = buildCookie('jwt', 'abc', {
      path: '/kuma',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 3600,
    });
    expect(cookie).toContain('jwt=abc');
    expect(cookie).toContain('Path=/kuma');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=3600');
  });

  it('basePath normalizes root and subpath', () => {
    expect(basePath(makeEnv({ BASE_PATH: '/kuma' }))).toBe('/kuma');
    expect(basePath(makeEnv({ BASE_PATH: '/kuma/' }))).toBe('/kuma');
    expect(basePath(makeEnv({ BASE_PATH: '/' }))).toBe('');
    expect(basePath(makeEnv({ BASE_PATH: '' }))).toBe('');
  });
});

describe('Auth: login redirect', () => {
  beforeEach(() => vi.stubGlobal('crypto', globalThis.crypto));
  afterEach(() => vi.unstubAllGlobals());

  it('redirects to Google consent with PKCE and state cookies', async () => {
    const env = makeEnv();
    const req = new Request('https://example.com/kuma/api/auth/login');
    const res = await handleAuthLogin(req, env);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location).toContain('code_challenge_method=S256');
    expect(location).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fkuma%2Fapi%2Fauth%2Fcallback');

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('pkce_verifier=');
    expect(setCookie).toContain('oauth_state=');
    expect(setCookie).toContain('Path=/kuma');
    expect(setCookie).toContain('HttpOnly');
  });
});

describe('Auth: chat route gating', () => {
  it('returns 401 without jwt cookie', async () => {
    const env = makeEnv();
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('returns 403 for valid jwt but unauthorized email', async () => {
    const env = makeEnv();
    const token = await signJwt('stranger@example.com', env.JWT_SECRET, 3600);
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `jwt=${token}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(403);
  });
});
