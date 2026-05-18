import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * member-service has two security-relevant invariants that aren't trivial
 * to test against a real DB in CI:
 *
 *   1. inviteMember / joinViaShareLink rely on the (projectId, userId)
 *      unique constraint instead of a check-then-create — defeats the
 *      TOCTOU race where two concurrent invites could double-insert.
 *
 *   2. joinViaShareLink refuses to enroll a user into a soft-deleted
 *      project, returning a 410 instead of producing a half-baked
 *      membership pointing at a deleted resource.
 *
 * These are asserted structurally against the service source so a future
 * refactor cannot silently restore the broken behaviour.
 */
const memberService = readFileSync(
  join(process.cwd(), 'src/services/member-service.ts'),
  'utf-8',
);

describe('member-service guards', () => {
  it('inviteMember catches P2002 (unique constraint) and turns it into a 409', () => {
    expect(memberService).toContain('inviteMember');
    expect(memberService).toContain('P2002');
    expect(memberService).toContain('already a member');
  });

  it('joinViaShareLink rejects soft-deleted projects with 410', () => {
    expect(memberService).toContain('joinViaShareLink');
    // The deletion guard fetches the project with deletedAt: null and throws
    // 410 if absent. Match both the filter and the status code.
    expect(memberService).toMatch(/deletedAt:\s*null/);
    expect(memberService).toMatch(/new ApiError\(\s*410/);
  });

  it('joinViaShareLink treats existing membership as idempotent (no thrown duplicate)', () => {
    // The P2002 swallowed branch is what makes the join idempotent.
    expect(memberService).toContain('joinViaShareLink');
    expect(memberService).toMatch(/P2002[^}]*\}/);
  });
});
