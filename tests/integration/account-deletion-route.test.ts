import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * DELETE /api/v1/user/account fans out across nine tables. A mid-way failure
 * (timeout, FK conflict, dropped connection) used to strand the account in a
 * partially-deleted state with no UI to recover it. Lock in the invariants
 * the route relies on so a future refactor cannot regress them silently.
 */
const route = readFileSync(
  join(process.cwd(), 'src/app/api/v1/user/account/route.ts'),
  'utf-8',
);

describe('DELETE /api/v1/user/account contract', () => {
  it('requires an authenticated session before doing anything else', () => {
    expect(route).toMatch(/await\s+auth\(\)/);
    expect(route).toContain('ApiErrors.unauthorized');
  });

  it('rate-limits with ACCOUNT_DELETE so repeated attempts back off', () => {
    expect(route).toContain('enforceRateLimit');
    expect(route).toContain('RATE_LIMITS.ACCOUNT_DELETE');
  });

  it('runs every deletion inside a single $transaction with a raised timeout', () => {
    expect(route).toContain('prisma.$transaction');
    expect(route).toMatch(/timeout:\s*30_?000/);
  });

  it('deletes via the transaction handle, not the top-level prisma client', () => {
    // Each model deletion must go through the `tx` callback param so the
    // transaction can roll the whole thing back. A stray `prisma.x.deleteMany`
    // inside the closure would commit independently.
    const inside = route.substring(
      route.indexOf('prisma.$transaction'),
      route.lastIndexOf('await prisma.$transaction'),
    );
    // The above slice may be empty; fall back to the whole body for the
    // forbidden-pattern check.
    const body = inside || route;
    expect(body).not.toMatch(/await\s+prisma\.\w+\.deleteMany/);
    expect(body).not.toMatch(/await\s+prisma\.user\.delete\b/);
  });

  it('removes the user only after every owned-data table has been cleared', () => {
    const userDeleteIdx = route.indexOf('tx.user.delete');
    expect(userDeleteIdx).toBeGreaterThan(-1);
    for (const earlier of [
      'tx.gitCredential.deleteMany',
      'tx.projectMember.deleteMany',
      'tx.template.deleteMany',
      'tx.auditLog.deleteMany',
    ]) {
      const idx = route.indexOf(earlier);
      expect(idx, `${earlier} should run before tx.user.delete`).toBeGreaterThan(-1);
      expect(idx).toBeLessThan(userDeleteIdx);
    }
  });
});
