import { describe, it, expect, beforeAll } from 'vitest';
import { signJwt, verifyJwt } from '../worker/lib/jwt';
import { isEmailAllowed } from '../worker/lib/allowlist';

const TEST_SECRET = 'test-secret-key-at-least-32-bytes-long';

describe('JWT utilities', () => {
  describe('signJwt', () => {
    it('creates a valid JWT string', async () => {
      const token = await signJwt({ email: 'test@example.com' }, TEST_SECRET, 3600);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyJwt', () => {
    it('verifies a valid JWT and returns payload', async () => {
      const token = await signJwt({ email: 'test@example.com' }, TEST_SECRET, 3600);
      const payload = await verifyJwt(token, TEST_SECRET);
      expect(payload).not.toBeNull();
      expect(payload?.email).toBe('test@example.com');
    });

    it('returns null for invalid signature', async () => {
      const token = await signJwt({ email: 'test@example.com' }, TEST_SECRET, 3600);
      const payload = await verifyJwt(token, 'wrong-secret-key-at-least-32-bytes');
      expect(payload).toBeNull();
    });

    it('returns null for expired JWT', async () => {
      const token = await signJwt({ email: 'test@example.com' }, TEST_SECRET, -1);
      const payload = await verifyJwt(token, TEST_SECRET);
      expect(payload).toBeNull();
    });

    it('returns null for malformed JWT', async () => {
      const payload = await verifyJwt('not.a.valid.jwt', TEST_SECRET);
      expect(payload).toBeNull();
    });
  });
});

describe('email allowlist', () => {
  it('allows email in allowlist', () => {
    expect(isEmailAllowed('alice@example.com', 'alice@example.com,bob@example.com')).toBe(true);
  });

  it('allows email case-insensitively', () => {
    expect(isEmailAllowed('Alice@Example.COM', 'alice@example.com')).toBe(true);
  });

  it('rejects email not in allowlist', () => {
    expect(isEmailAllowed('eve@evil.com', 'alice@example.com,bob@example.com')).toBe(false);
  });

  it('handles whitespace in allowlist', () => {
    expect(isEmailAllowed('bob@example.com', 'alice@example.com, bob@example.com ')).toBe(true);
  });

  it('rejects when allowlist is empty', () => {
    expect(isEmailAllowed('anyone@example.com', '')).toBe(false);
  });
});