import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(process.cwd(), 'src/services/compilation-service.ts'),
  'utf-8',
);

describe('compileViaAPI — upstream response size guards', () => {
  // The serverless compile path fetches from latex.ytotech.com. The old code
  // called `await response.arrayBuffer()` / `await response.text()` directly,
  // so a hostile or buggy peer with an unbounded body could OOM the instance.

  it('declares an explicit byte cap for the PDF body and the error body', () => {
    expect(src).toMatch(/MAX_COMPILE_RESPONSE_BYTES\s*=\s*\d/);
    expect(src).toMatch(/MAX_COMPILE_ERROR_BYTES\s*=\s*\d/);
  });

  it('streams the body with a size-checked reader, not arrayBuffer/text', () => {
    expect(src).toContain('readBoundedBody');
    // No remaining direct, unbounded buffering of the upstream response.
    expect(src).not.toMatch(/response\.arrayBuffer\(\)/);
    expect(src).not.toMatch(/response\.text\(\)/);
  });

  it('readBoundedBody honours content-length as an early-exit hint', () => {
    expect(src).toMatch(/content-length/);
    expect(src).toMatch(/declared\s*>\s*maxBytes/);
  });

  it('readBoundedBody also enforces the cap during streaming', () => {
    // Catches peers that omit or lie about content-length.
    expect(src).toMatch(/total\s*\+=\s*value\.length/);
    expect(src).toMatch(/total\s*>\s*maxBytes/);
  });

  it('marks the compilation failed (not partial) when the cap is hit', () => {
    expect(src).toMatch(/exceeded the .*size limit/);
    expect(src).toMatch(/status:\s*'failed'/);
  });
});
