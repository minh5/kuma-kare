import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../worker/lib/jwt';

describe('JWT utilities', () => {
  const secret = 'test-secret-key-at-least-32-bytes-long';
  const email = 'caretaker@example.com';

  describe('signJwt', () => {
    it('creates a valid JWT string', async () => {
      const token = await signJwt(email, secret, 3600);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('includes email in payload', async () => {
      const token = await signJwt(email, secret, 3600);
      const payload = await verifyJwt(token, secret);
      expect(payload?.email).toBe(email);
    });
  });

  describe('verifyJwt', () => {
    it('returns payload for valid token', async () => {
      const token = await signJwt(email, secret, 3600);
      const payload = await verifyJwt(token, secret);
      expect(payload).not.toBeNull();
      expect(payload?.email).toBe(email);
    });

    it('returns null for invalid signature', async () => {
      const token = await signJwt(email, secret, 3600);
      const payload = await verifyJwt(token, 'wrong-secret-key-at-least-32-bytes');
      expect(payload).toBeNull();
    });

    it('returns null for expired token', async () => {
      const token = await signJwt(email, secret, -1);
      const payload = await verifyJwt(token, secret);
      expect(payload).toBeNull();
    });

    it('returns null for malformed token', async () => {
      const payload = await verifyJwt('not.a.valid.token', secret);
      expect(payload).toBeNull();
    });

    it('returns null for empty token', async () => {
      const payload = await verifyJwt('', secret);
      expect(payload).toBeNull();
    });
  });
});