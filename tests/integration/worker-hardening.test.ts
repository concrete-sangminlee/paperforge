import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Worker invariants asserted structurally because we can't spin up a real
 * BullMQ worker + Postgres + MinIO in the unit test harness. These guard
 * the recent hardening pass against silent regressions in a refactor.
 */
const worker = readFileSync(
  join(process.cwd(), 'worker/src/index.ts'),
  'utf-8',
);

describe('worker hardening invariants', () => {
  it('tracks in-flight compilations so shutdown can flush them', () => {
    expect(worker).toContain('inFlight');
    expect(worker).toMatch(/inFlight\.add\(compilationId\)/);
    expect(worker).toMatch(/inFlight\.delete\(compilationId\)/);
  });

  it('graceful shutdown marks in-flight compilations as failed', () => {
    // The flush loop runs against `inFlight` inside `shutdown`.
    expect(worker).toMatch(/for\s*\(\s*const\s+compilationId\s+of\s+inFlight\s*\)/);
    expect(worker).toContain("status: 'failed'");
    expect(worker).toContain('worker-restart');
  });

  it('marks compilation row failed only on the final attempt', () => {
    // Gating on attemptsMade >= attempts prevents transient retries from
    // showing the user a red status that will turn green on the next try.
    expect(worker).toContain('exhausted');
    expect(worker).toMatch(/job\.attemptsMade\s*>=/);
  });

  it('downloads canonicalize paths via realpath to defeat symlink escapes', () => {
    expect(worker).toContain('fs.realpathSync');
    expect(worker).toContain('workDirReal');
    expect(worker).toContain('Symlink escape blocked');
  });

  it('rejects absolute / Windows / NUL-byte paths before writing', () => {
    expect(worker).toContain("startsWith('/')");
    expect(worker).toMatch(/\^\[A-Za-z\]:/);
    expect(worker).toContain("'\\0'");
  });
});
