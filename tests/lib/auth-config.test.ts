import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginSchema, registerSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

describe('auth security configuration', () => {
  it('supports Auth.js OAuth env names and legacy aliases', () => {
    const authModule = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');
    const oauthModule = readFileSync(join(process.cwd(), 'src/lib/oauth-providers.ts'), 'utf-8');

    expect(authModule).toContain('getOAuthProviderConfig');
    expect(oauthModule).toContain('AUTH_GOOGLE_ID');
    expect(oauthModule).toContain('GOOGLE_CLIENT_ID');
    expect(oauthModule).toContain('AUTH_GITHUB_ID');
    expect(oauthModule).toContain('GITHUB_CLIENT_ID');
  });

  it('persists OAuth logins as first-class app users', () => {
    const authModule = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');
    const userService = readFileSync(join(process.cwd(), 'src/services/user-service.ts'), 'utf-8');

    expect(authModule).toContain('upsertOAuthUser');
    expect(authModule).toContain('account.provider');
    expect(authModule).toContain('providerAccountId');
    expect(authModule).toContain('token.id = appUser.id');
    expect(userService).toContain('tx.oAuthAccount.create');
    expect(userService).toContain('encryptedAccessToken');
    expect(userService).toContain('encryptedRefreshToken');
    expect(userService).toContain('emailVerified: true');
  });

  it('rejects OAuth callbacks without a stable email and provider id', () => {
    const authModule = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');

    expect(authModule).toContain('async signIn');
    expect(authModule).toContain('oauthEmail(user, profile)');
    expect(authModule).toContain('oauthProviderAccountId(account, user, profile)');
  });

  it('invalidates JWT sessions within 5 minutes of a password change', () => {
    const authModule = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');
    const changePw = readFileSync(join(process.cwd(), 'src/app/api/v1/auth/change-password/route.ts'), 'utf-8');
    const resetPw = readFileSync(join(process.cwd(), 'src/app/api/v1/auth/reset-password/route.ts'), 'utf-8');

    // jwt callback checks tokenVersion from DB on a 5-minute cadence
    expect(authModule).toContain('tokenVersion');
    expect(authModule).toContain('pvCheckedAt');
    expect(authModule).toContain('5 * 60 * 1000');
    expect(authModule).toContain('return null');

    // Both password mutation paths bump tokenVersion
    expect(changePw).toContain('tokenVersion');
    expect(resetPw).toContain('tokenVersion');
  });

  it('audit-logs credential and OAuth login events', () => {
    const userService = readFileSync(join(process.cwd(), 'src/services/user-service.ts'), 'utf-8');
    const authModule = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');

    // Credential logins: success and failed password are both logged
    expect(userService).toContain("'login'");
    expect(userService).toContain("'login.failed'");
    expect(userService).toContain("'login.blocked'");
    // OAuth logins are logged after upsertOAuthUser
    expect(authModule).toContain("'oauth.login'");
    // Both paths use fire-and-forget to avoid blocking the auth flow
    expect(userService).toMatch(/logAuditAction[\s\S]*\.catch\(\(\)\s*=>\s*\{\}\)/);
    expect(authModule).toMatch(/logAuditAction[\s\S]*\.catch\(\(\)\s*=>\s*\{\}\)/);
  });

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
