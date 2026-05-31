import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

function collectRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

function routeContent(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

const routeFiles = collectRouteFiles(resolve(process.cwd(), 'src/app/api/v1'));
const hasMutationMethod = /export async function (POST|PATCH|PUT|DELETE)\s*\(/;
const hasRateLimit = /enforceRateLimit|checkRateLimit/;
const hasRateLimitHeaders = /rateLimitHeaders/;
const hasAudit = /logAuditAction|tx\.auditLog\.create|tx\.auditLog\.createMany|tx\.auditLog\.deleteMany/;

describe('route hardening invariants', () => {
  it('mutation routes must enforce a rate limit', () => {
    const missingRateLimit: string[] = [];

    for (const file of routeFiles) {
      const source = routeContent(file);
      if (!hasMutationMethod.test(source)) continue;
      if (!hasRateLimit.test(source)) {
        missingRateLimit.push(file);
      }
    }

    expect(missingRateLimit, `Missing rate limit in: ${missingRateLimit.join('\n')}`).toEqual([]);
  });

  it('mutation routes should log audit actions', () => {
    const missingAudit: string[] = [];

    for (const file of routeFiles) {
      const source = routeContent(file);
      if (!hasMutationMethod.test(source)) continue;
      if (!hasAudit.test(source)) {
        missingAudit.push(file);
      }
    }

    expect(missingAudit, `Missing audit logging in: ${missingAudit.join('\n')}`).toEqual([]);
  });

  it('checkRateLimit calls should use centralized config + emit headers on manual branches', () => {
    const badNumericWindow: string[] = [];
    const missingHeaders: string[] = [];

    for (const file of routeFiles) {
      const source = routeContent(file);
      const matchManual = /checkRateLimit\s*\(/.test(source);
      if (!matchManual) continue;

      if (!/enforceRateLimit/.test(source) && !hasRateLimitHeaders.test(source)) {
        missingHeaders.push(file);
      }

      if (/checkRateLimit\s*\([^,]+,\s*\d+/.test(source)) {
        badNumericWindow.push(file);
      }
    }

    expect(badNumericWindow, `checkRateLimit should use RATE_LIMITS config: ${badNumericWindow.join('\n')}`).toEqual([]);
    expect(missingHeaders, `checkRateLimit branch should include rateLimitHeaders: ${missingHeaders.join('\n')}`).toEqual([]);
  });
});
