import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('user profile route', () => {
  const p = readFileSync(join(process.cwd(), 'src/app/api/v1/user/profile/route.ts'), 'utf-8');
  it('has GET', () => { expect(p).toContain('GET'); });
  it('has PATCH', () => { expect(p).toContain('PATCH'); });
  it('uses apiSuccess', () => { expect(p).toContain('apiSuccess'); });
  it('uses ApiErrors', () => { expect(p).toContain('ApiErrors'); });
});

describe('user settings route', () => {
  const s = readFileSync(join(process.cwd(), 'src/app/api/v1/user/settings/route.ts'), 'utf-8');
  it('has GET', () => { expect(s).toContain('GET'); });
  it('has PATCH', () => { expect(s).toContain('PATCH'); });
  it('merges settings', () => { expect(s).toContain('merged'); });
});

describe('user git-credentials route', () => {
  const g = readFileSync(join(process.cwd(), 'src/app/api/v1/user/git-credentials/route.ts'), 'utf-8');
  it('has GET', () => { expect(g).toContain('GET'); });
  it('has POST', () => { expect(g).toContain('POST'); });
  it('delete route exists', () => { expect(existsSync(join(process.cwd(), 'src/app/api/v1/user/git-credentials/[credentialId]/route.ts'))).toBe(true); });
});
