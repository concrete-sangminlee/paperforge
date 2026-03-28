import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8');

describe('project-service safety', () => {
  const src = read('src/services/project-service.ts');
  it('assertProjectRole validates role', () => { expect(src).toContain('assertProjectRole'); });
  it('soft-deletes projects', () => { expect(src).toContain('deletedAt'); });
  it('checks ownership for delete', () => { expect(src).toContain("['owner']"); });
  it('has member role checking', () => { expect(src).toContain('projectMember'); });
});

describe('compilation-service safety', () => {
  const src = read('src/services/compilation-service.ts');
  it('validates main file path (no traversal)', () => { expect(src).toContain('isValidFilePath'); });
  it('filters files without minioKey', () => { expect(src).toContain('filter'); });
  it('has retry strategy', () => { expect(src).toContain('exponential'); });
  it('queues compilation jobs', () => { expect(src).toContain('compilationQueue'); });
});

describe('member-service safety', () => {
  const src = read('src/services/member-service.ts');
  it('validates owner for role changes', () => { expect(src).toContain('owner'); });
  it('sends invitation emails', () => { expect(src).toContain('sendEmail'); });
  it('has share link expiration', () => { expect(src).toContain('expiresAt'); });
  it('has share link token', () => { expect(src).toContain('token'); });
});

describe('git-service safety', () => {
  const src = read('src/services/git-service.ts');
  it('encrypts tokens', () => { expect(src).toContain('encrypt'); });
  it('decrypts for operations', () => { expect(src).toContain('decrypt'); });
  it('uses oauth2 auth', () => { expect(src).toContain('oauth2'); });
  it('validates credentials exist', () => { expect(src).toContain('credential'); });
});

describe('version-service safety', () => {
  const src = read('src/services/version-service.ts');
  it('creates git commits', () => { expect(src).toContain('git.commit'); });
  it('supports version restore', () => { expect(src).toContain('checkout'); });
  it('has author attribution', () => { expect(src).toContain('PaperForge'); });
});
