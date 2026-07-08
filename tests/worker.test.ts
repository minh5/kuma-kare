import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkerHandler } from '../worker/index';
import { signJwt } from '../worker/lib/jwt';

const TEST_ENV = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  JWT_SECRET: 'test-jwt-secret-at-least-32-bytes-long',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  ALLOWED_EMAILS: 'allowed@example.com',
  BASE_PATH: ''
};

describe('Worker routes', () => {
  let handler: ReturnType<typeof createWorkerHandler>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    handler = createWorkerHandler();
  });

  describe('GET /api/auth/login', () => {
    it('redirects to Google OAuth', async () => {
      const request = new Request('https://example.com/api/auth/login');
      const response = await handler(request, TEST_ENV);
      
      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('accounts.google.com');
      expect(location).toContain('client_id=test-client-id');
    });
  });

  describe('POST /api/chat', () => {
    it('returns 401 without JWT cookie', async () => {
      const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      });
      const response = await handler(request, TEST_ENV);
      
      expect(response.status).toBe(401);
    });

    it('returns 401 with invalid JWT', async () => {
      const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'jwt=invalid.token.here'
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      });
      const response = await handler(request, TEST_ENV);
      
      expect(response.status).toBe(401);
    });

    it('returns 403 for valid JWT with unauthorized email', async () => {
      const token = await signJwt({ email: 'notallowed@example.com' }, TEST_ENV.JWT_SECRET, 3600);
      const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `jwt=${token}`
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      });
      const response = await handler(request, TEST_ENV);
      
      expect(response.status).toBe(403);
    });

    it('returns LLM response for valid auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Feed the cat twice daily.' }] })
      });

      const token = await signJwt({ email: 'allowed@example.com' }, TEST_ENV.JWT_SECRET, 3600);
      const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `jwt=${token}`
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'How do I feed the cat?' }] })
      });
      const response = await handler(request, TEST_ENV);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.content).toBe('Feed the cat twice daily.');
    });

    it('includes care guide in system prompt sent to LLM', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Response' }] })
      });

      const token = await signJwt({ email: 'allowed@example.com' }, TEST_ENV.JWT_SECRET, 3600);
      const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `jwt=${token}`
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Test' }] })
      });
      await handler(request, TEST_ENV);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.system.toLowerCase()).toMatch(/cat|care|feeding/);
    });
  });

  describe('BASE_PATH support', () => {
    it('routes correctly with /kuma BASE_PATH', async () => {
      const envWithBasePath = { ...TEST_ENV, BASE_PATH: '/kuma' };
      const request = new Request('https://example.com/kuma/api/auth/login');
      const response = await handler(request, envWithBasePath);
      
      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('accounts.google.com');
    });

    it('returns 404 for wrong path prefix', async () => {
      const envWithBasePath = { ...TEST_ENV, BASE_PATH: '/kuma' };
      const request = new Request('https://example.com/api/auth/login');
      const response = await handler(request, envWithBasePath);
      
      expect(response.status).toBe(404);
    });
  });
});