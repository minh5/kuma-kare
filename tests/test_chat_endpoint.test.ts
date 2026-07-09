import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../worker/index';
import { signJwt } from '../worker/lib/jwt';
import { getCareGuide } from '../worker/lib/careGuide';
import type { Env } from '../worker/types';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    JWT_SECRET: 'test-secret-key-at-least-32-bytes-long',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    ALLOWED_EMAILS: 'caretaker@example.com',
    BASE_PATH: '/kuma',
    ...overrides,
  };
}

function anthropicOk(text: string) {
  return {
    ok: true,
    json: () => Promise.resolve({ content: [{ text }] }),
  };
}

describe('Chat endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns 401 without auth cookie', async () => {
    const env = makeEnv();
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('returns LLM response text with valid auth (mocked LLM)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      anthropicOk('Feed Kuma 1/4 cup twice daily.'),
    );
    vi.stubGlobal('fetch', mockFetch);

    const env = makeEnv();
    const token = await signJwt('caretaker@example.com', env.JWT_SECRET, 3600);
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `jwt=${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'How do I feed Kuma?' }],
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { response: string };
    expect(data.response).toBe('Feed Kuma 1/4 cup twice daily.');
  });

  it('injects care guide content into the system prompt', async () => {
    const mockFetch = vi.fn().mockResolvedValue(anthropicOk('ok'));
    vi.stubGlobal('fetch', mockFetch);

    const env = makeEnv();
    const token = await signJwt('caretaker@example.com', env.JWT_SECRET, 3600);
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `jwt=${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    await worker.fetch(req, env);

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.system).toContain(getCareGuide());
    expect(sentBody.system.toLowerCase()).toContain('emergency contacts');
    expect(sentBody.model).toBe('claude-haiku-4-5-20241022');
  });

  it('returns 400 for empty messages array', async () => {
    const env = makeEnv();
    const token = await signJwt('caretaker@example.com', env.JWT_SECRET, 3600);
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `jwt=${token}`,
      },
      body: JSON.stringify({ messages: [] }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('returns 502 when Anthropic API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));
    const env = makeEnv();
    const token = await signJwt('caretaker@example.com', env.JWT_SECRET, 3600);
    const req = new Request('https://example.com/kuma/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `jwt=${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(502);
  });
});

describe('Contacts endpoint', () => {
  it('returns 401 without auth', async () => {
    const env = makeEnv();
    const req = new Request('https://example.com/kuma/api/contacts', {
      method: 'GET',
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('returns emergency contacts markdown with auth', async () => {
    const env = makeEnv();
    const token = await signJwt('caretaker@example.com', env.JWT_SECRET, 3600);
    const req = new Request('https://example.com/kuma/api/contacts', {
      method: 'GET',
      headers: { cookie: `jwt=${token}` },
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { content: string };
    expect(data.content.toLowerCase()).toContain('vet');
    expect(data.content).not.toBe(getCareGuide());
  });
});

describe('Worker routing by BASE_PATH', () => {
  it('routes /api/chat at root when BASE_PATH=/', async () => {
    const env = makeEnv({ BASE_PATH: '/' });
    const req = new Request('https://example.com/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown routes', async () => {
    const env = makeEnv();
    const req = new Request('https://example.com/kuma/api/unknown', {
      method: 'GET',
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(404);
  });
});
