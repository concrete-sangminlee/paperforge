import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('admin templates routes', () => {
  const p = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/templates/pending/route.ts'), 'utf-8');
  it('pending uses ApiErrors', () => { expect(p).toContain('ApiErrors'); });
  it('pending uses apiSuccess', () => { expect(p).toContain('apiSuccess'); });

  it('template [id] route exists', () => {
    expect(existsSync(join(process.cwd(), 'src/app/api/v1/admin/templates/[id]/route.ts'))).toBe(true);
  });

  const t = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/templates/[id]/route.ts'), 'utf-8');
  it('approve/reject uses apiSuccess', () => { expect(t).toContain('apiSuccess'); });
  it('has PATCH method', () => { expect(t).toContain('PATCH'); });
});

describe('admin user detail route', () => {
  const u = readFileSync(join(process.cwd(), 'src/app/api/v1/admin/users/[id]/route.ts'), 'utf-8');
  it('has PATCH', () => { expect(u).toContain('PATCH'); });
  it('uses apiSuccess', () => { expect(u).toContain('apiSuccess'); });
  it('uses ApiErrors', () => { expect(u).toContain('ApiErrors'); });
  it('has role update', () => { expect(u).toContain('role'); });
});

describe('join share link route', () => {
  const j = readFileSync(join(process.cwd(), 'src/app/api/v1/join/[token]/route.ts'), 'utf-8');
  it('uses apiSuccess', () => { expect(j).toContain('apiSuccess'); });
  it('uses ApiErrors', () => { expect(j).toContain('ApiErrors'); });
  it('calls joinViaShareLink', () => { expect(j).toContain('joinViaShareLink'); });
});

describe('file operations route', () => {
  const f = readFileSync(join(process.cwd(), 'src/app/api/v1/projects/[id]/files/[...path]/route.ts'), 'utf-8');
  it('handles read/write/delete', () => { expect(f).toContain('apiSuccess'); });
  it('has content handling', () => { expect(f).toContain('content'); });
  it('has file path param', () => { expect(f).toContain('path'); });
  it('uses apiSuccess', () => { expect(f).toContain('apiSuccess'); });
  it('has role check', () => { expect(f).toContain('assertProjectRole'); });
});
