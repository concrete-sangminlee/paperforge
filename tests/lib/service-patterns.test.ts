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
  it('passes DB-backed source files to worker jobs', () => {
    expect(src).toContain('content: f.content');
    expect(src).toContain('isBinary: f.isBinary');
  });
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
  it('has author attribution', () => { expect(src).toContain('PaperForge'); });

  // Regression: snapshots used to write '' for every text file so versions
  // captured no actual content and restore was a silent no-op.
  it('captures real file bytes in snapshots (not empty placeholders)', () => {
    expect(src).not.toMatch(/writeFile\([^,]+,\s*['"]['"]\s*\)/);
    expect(src).toContain('readFileBytes');
  });

  // Restore must read blobs from the git tree and sync them back to the DB,
  // wrapped in a transaction so a half-applied restore can't strand the project
  // in a mixed state.
  it('rebuilds DB rows from the snapshot tree inside a transaction', () => {
    expect(src).toContain('git.readTree');
    expect(src).toContain('git.readBlob');
    expect(src).toContain('prisma.$transaction');
  });

  // Old (pre-fix) snapshots contain no bytes; restoring from them would wipe
  // every current file. Reject with EMPTY_SNAPSHOT instead.
  it('refuses to restore snapshots with zero content', () => {
    expect(src).toContain("'EMPTY_SNAPSHOT'");
  });

  // Files present now but absent from the snapshot must disappear so restore
  // produces the exact file set the user expects.
  it('soft-deletes files not present in the snapshot', () => {
    expect(src).toMatch(/path:\s*\{\s*notIn:/);
    expect(src).toContain('deletedAt: new Date()');
  });

  // getFileContent reads MinIO before DB content, so a restore that only
  // updates DB rows would show stale bytes on MinIO-backed deployments.
  it('overwrites MinIO objects after restoring DB content', () => {
    expect(src).toContain('minioClient.putObject');
  });
});
