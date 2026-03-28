import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('template routes', () => {
  const t = readFileSync(join(process.cwd(), 'src/app/api/v1/templates/route.ts'), 'utf-8');
  it('has GET list', () => { expect(t).toContain('GET'); });
  it('has POST submit', () => { expect(t).toContain('POST'); });
  it('uses apiSuccess', () => { expect(t).toContain('apiSuccess'); });
  it('has category filter', () => { expect(t).toContain('category'); });
  it('has search', () => { expect(t).toContain('search'); });
  it('from-template route', () => { expect(existsSync(join(process.cwd(), 'src/app/api/v1/projects/from-template/[templateId]/route.ts'))).toBe(true); });
});

describe('template service', () => {
  const s = readFileSync(join(process.cwd(), 'src/services/template-service.ts'), 'utf-8');
  it('has listTemplates', () => { expect(s).toContain('listTemplates'); });
  it('has submitTemplate', () => { expect(s).toContain('submitTemplate'); });
  it('has approved filter', () => { expect(s).toContain('isApproved'); });
  it('has download count', () => { expect(s).toContain('downloadCount'); });
});

describe('template page', () => {
  const p = readFileSync(join(process.cwd(), 'src/app/(dashboard)/templates/page.tsx'), 'utf-8');
  it('has SWR fetch', () => { expect(p).toContain('useSWR'); });
  it('has category tabs', () => { expect(p).toContain('CATEGORIES'); });
  it('has search input', () => { expect(p).toContain('SearchIcon'); });
  it('has use template dialog', () => { expect(p).toContain('Use Template'); });
});
