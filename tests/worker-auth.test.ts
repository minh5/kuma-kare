import { describe, it, expect, beforeAll } from 'vitest';
import { signJWT, verifyJWT } from '../worker/lib/jwt';
import { verifyAuth } from '../worker/middleware/verifyAuth';

const TEST_SECRET = 'test-secret-key-at-least-32-bytes-long';

describe('JWT utilities', () => {
  describe('signJWT', () => {
    it('creates a valid JWT string', async () => {
      const token = await signJWT({ email: 'test@example.com' }, TEST_SECRET, 3600);
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it('includes email claim in payload', async () => {
      const token = await signJWT({ email: 'cat@caretaker.com' }, TEST_SECRET, 3600);
      const result = await verifyJWT(token, TEST_SECRET);
      expect(result?.email).toBe('cat@caretaker.com');
    });
  });

  describe('verifyJWT', () => {
    it('returns payload for valid token', async () => {
      const token = await signJWT({ email: 'valid@test.com' }, TEST_SECRET, 3600);
      const result = await verifyJWT(token, TEST_SECRET);
      expect(result).not.toBeNull();
      expect(result?.email).toBe('valid@test.com');
    });

    it('returns null for invalid signature', async () => {
      const token = await signJWT({ email: 'test@test.com' }, TEST_SECRET, 3600);
      const result = await verifyJWT(token, 'wrong-secret-key-at-least-32-bytes');
      expect(result).toBeNull();
    });

    it('returns null for expired token', async () => {
      const token = await signJWT({ email: 'test@test.com' }, TEST_SECRET, -1);
      const result = await verifyJWT(token, TEST_SECRET);
      expect(result).toBeNull();
    });

    it('returns null for malformed token', async () => {
      const result = await verifyJWT('not.a.valid.token', TEST_SECRET);
      expect(result).toBeNull();
    });
  });
});

describe('verifyAuth middleware', () => {
  it('extracts email from valid JWT cookie', async () => {
    const token = await signJWT({ email: 'auth@test.com' }, TEST_SECRET, 3600);
    const mockRequest = {
      headers: new Headers({ Cookie: `jwt=${token}` })
    } as unknown as Request;
    
    const result = await verifyAuth(mockRequest, TEST_SECRET);
    expect(result).toBe('auth@test.com');
  });

  it('returns null when no cookie present', async () => {
    const mockRequest = {
      headers: new Headers({})
    } as unknown as Request;
    
    const result = await verifyAuth(mockRequest, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('returns null when jwt cookie is missing', async () => {
    const mockRequest = {
      headers: new Headers({ Cookie: 'other=value' })
    } as unknown as Request;
    
    const result = await verifyAuth(mockRequest, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('returns null for expired JWT in cookie', async () => {
    const token = await signJWT({ email: 'expired@test.com' }, TEST_SECRET, -1);
    const mockRequest = {
      headers: new Headers({ Cookie: `jwt=${token}` })
    } as unknown as Request;
    
    const result = await verifyAuth(mockRequest, TEST_SECRET);
    expect(result).toBeNull();
  });
});