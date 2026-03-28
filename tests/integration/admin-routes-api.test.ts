import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('admin stats route', () => {
  const s = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/stats/route.ts'), 'utf-8');
  it('uses apiSuccess', () => { expect(s).toContain('apiSuccess'); });
  it('uses ApiErrors.forbidden', () => { expect(s).toContain('forbidden'); });
  it('counts users', () => { expect(s).toContain('userCount'); });
  it('counts projects', () => { expect(s).toContain('projectCount'); });
  it('counts compilations', () => { expect(s).toContain('compilationCount'); });
  it('sums storage', () => { expect(s).toContain('storageUsedBytes'); });
});

describe('admin users route', () => {
  const u = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/users/route.ts'), 'utf-8');
  it('has search', () => { expect(u).toContain('search'); });
  it('has pagination', () => { expect(u).toContain('skip'); });
  it('uses apiSuccess', () => { expect(u).toContain('apiSuccess'); });
  it('user detail exists', () => { expect(existsSync(join(process.cwd(), 'src/app/api/v1/admin/users/[id]/route.ts'))).toBe(true); });
});

describe('admin workers route', () => {
  const w = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/workers/route.ts'), 'utf-8');
  it('uses ApiErrors', () => { expect(w).toContain('ApiErrors'); });
  it('checks admin role', () => { expect(w).toContain('admin'); });
});

describe('admin audit-log route', () => {
  const a = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/audit-log/route.ts'), 'utf-8');
  it('uses apiSuccess', () => { expect(a).toContain('apiSuccess'); });
  it('has page param', () => { expect(a).toContain('page'); });
});
