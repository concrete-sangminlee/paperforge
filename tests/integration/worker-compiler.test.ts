import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('worker compiler', () => {
  const c = readFileSync(join(process.cwd(), 'worker/src/compiler.ts'), 'utf-8');
  it('supports pdflatex', () => { expect(c).toContain('pdflatex'); });
  it('supports xelatex', () => { expect(c).toContain('xelatex'); });
  it('supports lualatex', () => { expect(c).toContain('lualatex'); });
  it('has latexmk', () => { expect(c).toContain('latexmk'); });
  it('has timeout', () => { expect(c).toContain('timeout'); });
  it('has synctex', () => { expect(c).toContain('synctex'); });
  it('has pandoc DOCX', () => { expect(c).toContain('pandoc'); });
  it('has error output', () => { expect(c).toContain('stderr'); });
});

describe('worker index', () => {
  const w = readFileSync(join(process.cwd(), 'worker/src/index.ts'), 'utf-8');
  it('has BullMQ worker', () => { expect(w).toContain('Worker'); });
  it('has SIGTERM', () => { expect(w).toContain('SIGTERM'); });
  it('has failed handler', () => { expect(w).toContain('failed'); });
  it('has completed handler', () => { expect(w).toContain('completed'); });
  it('has MinIO download', () => { expect(w).toContain('minio'); });
  it('has Prisma update', () => { expect(w).toContain('prisma'); });
});
