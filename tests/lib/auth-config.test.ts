import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

describe('auth security configuration', () => {
  describe('login validation', () => {
    it('rejects empty email', () => {
      const result = loginSchema.safeParse({ email: '', password: 'test' });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
      expect(result.success).toBe(false);
    });

    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({ email: 'user@test.com', password: 'pass' });
      expect(result.success).toBe(true);
    });
  });

  describe('register validation security', () => {
    it('requires uppercase in password', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com', name: 'Test', password: 'lowercase1',
      });
      expect(result.success).toBe(false);
    });

    it('requires digit in password', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com', name: 'Test', password: 'NoDigitHere',
      });
      expect(result.success).toBe(false);
    });

    it('requires minimum 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com', name: 'Test', password: 'Sh1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects names over 255 characters', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com', name: 'x'.repeat(256), password: 'ValidPass1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('rateLimitHeaders utility', () => {
    it('generates correct headers for allowed request', () => {
      const headers = rateLimitHeaders(10, { allowed: true, remaining: 7 });
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('7');
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('generates correct headers for blocked request', () => {
      const headers = rateLimitHeaders(10, { allowed: false, remaining: 0, retryAfter: 60 });
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBe('60');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('clamps remaining to 0 minimum', () => {
      const headers = rateLimitHeaders(5, { allowed: false, remaining: -1, retryAfter: 30 });
      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });
});
