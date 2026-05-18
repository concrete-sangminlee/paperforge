import { afterEach, describe, expect, it } from 'vitest';
import { getAppBaseUrl } from '@/lib/app-url';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('app base URL', () => {
  it('prefers the explicit public app URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/app-path?ignored=1';
    process.env.NEXTAUTH_URL = 'https://auth.example.com';

    expect(getAppBaseUrl()).toBe('https://example.com');
  });

  it('normalizes Vercel host names without a protocol', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'projectlatexcompiler.vercel.app';

    expect(getAppBaseUrl()).toBe('https://projectlatexcompiler.vercel.app');
  });

  it('falls back to the production deployment URL', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    expect(getAppBaseUrl()).toBe('https://projectlatexcompiler.vercel.app');
  });
});
