import { describe, it, expect } from 'vitest';
import { createSignedToken, verifySignedToken } from '@/lib/jwt-utils';

describe('jwt-utils', () => {
  it('should create and verify a token roundtrip', () => {
    const payload = { userId: '123', type: 'email-verify' };
    const token = createSignedToken(payload, '1h');
    const decoded = verifySignedToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('should reject a tampered token', () => {
    const token = createSignedToken({ userId: '123' }, '1h');
    // Tamper with the token by changing a character in the signature
    const parts = token.split('.');
    const tamperedSig = parts[2].slice(0, -1) + (parts[2].slice(-1) === 'a' ? 'b' : 'a');
    const tampered = parts[0] + '.' + parts[1] + '.' + tamperedSig;
    expect(() => verifySignedToken(tampered)).toThrow();
  });

  it('should reject an expired token', async () => {
    const token = createSignedToken({ userId: '123' }, '0s');
    // Wait a moment for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(() => verifySignedToken(token)).toThrow();
  });
});
