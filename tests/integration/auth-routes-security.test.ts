import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('auth routes have rate limiting', () => {
  const routes = [
    { file: 'src/app/api/v1/auth/register/route.ts', key: 'rate:register' },
    { file: 'src/app/api/v1/auth/forgot-password/route.ts', key: 'rate:forgot' },
    { file: 'src/app/api/v1/auth/reset-password/route.ts', key: 'rate:reset' },
  ];

  routes.forEach(({ file, key }) => {
    it(`${file.split('/').pop()} has checkRateLimit`, () => {
      const c = readFileSync(join(process.cwd(), file), 'utf-8');
      expect(c).toContain('checkRateLimit');
    });
    it(`${file.split('/').pop()} uses ${key} key`, () => {
      const c = readFileSync(join(process.cwd(), file), 'utf-8');
      expect(c).toContain(key);
    });
  });

  it('auth.ts has login rate limiting', () => {
    const c = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');
    expect(c).toContain('checkRateLimit');
    expect(c).toContain('rate:login');
  });

  it('auth.ts has cookie hardening', () => {
    const c = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');
    expect(c).toContain('httpOnly');
    expect(c).toContain('sameSite');
  });

  it('compile route has rate limiting', () => {
    const c = readFileSync(join(process.cwd(), 'src/app/api/v1/projects/[id]/compile/route.ts'), 'utf-8');
    expect(c).toContain('checkRateLimit');
    expect(c).toContain('rateLimitHeaders');
  });

  it('export route has rate limiting', () => {
    const c = readFileSync(join(process.cwd(), 'src/app/api/v1/projects/[id]/export/route.ts'), 'utf-8');
    expect(c).toContain('checkRateLimit');
  });
});
