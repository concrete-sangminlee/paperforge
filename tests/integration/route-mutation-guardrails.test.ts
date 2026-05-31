import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, Dirent } from 'fs';
import { join } from 'path';

const SOURCE_ROOT = 'src/app/api/v1';

const AUDIT_EXEMPT_ROUTES = new Set([
  'src/app/api/v1/render/route.ts', // public endpoint; intentionally no audit trail
]);

const AUTH_EXEMPT_MUTATION_ROUTES = new Set([
  'src/app/api/v1/render/route.ts', // public render helper endpoint
  'src/app/api/v1/auth/forgot-password/route.ts', // unauthenticated by design for recovery
  'src/app/api/v1/auth/register/route.ts', // allows bootstrap account creation
  'src/app/api/v1/auth/reset-password/route.ts', // bootstrap without existing session
]);

function listRouteFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }) as Dirent[];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      result.push(fullPath);
    }
  }
  return result;
}

function hasMutationHandler(source: string) {
  return /export async function\s+(POST|PATCH|PUT|DELETE)\s*\(/.test(source);
}

function hasRateLimit(source: string) {
  return /enforceRateLimit|checkRateLimit/.test(source);
}

function hasAudit(source: string) {
  return /logAuditAction|auditLog\.create/.test(source);
}

describe('mutation route guardrails', () => {
  const routeFiles = listRouteFiles(SOURCE_ROOT).map((path) => path.replace(/\\/g, '/'));
  const mutationRoutes = routeFiles.filter((path) => hasMutationHandler(readFileSync(path, 'utf-8')));

  for (const routePath of mutationRoutes) {
    it(`rate limits mutation route: ${routePath}`, () => {
      const source = readFileSync(routePath, 'utf-8');
      expect(source, `${routePath} must enforce rate limiting`).toMatch(/enforceRateLimit|checkRateLimit/);
      expect(hasRateLimit(source)).toBe(true);
    });

    if (!AUDIT_EXEMPT_ROUTES.has(routePath)) {
      it(`audits mutation route: ${routePath}`, () => {
        const source = readFileSync(routePath, 'utf-8');
        expect(hasAudit(source), `${routePath} must call logAuditAction or write audit_log`).toBe(true);
      });
    }

    it(`requires auth or explicit exception: ${routePath}`, () => {
      if (AUTH_EXEMPT_MUTATION_ROUTES.has(routePath)) return;
      const source = readFileSync(routePath, 'utf-8');
      expect(source).toContain('auth()');
    });
  }

  it('render endpoint does not reference external stylesheets for HTML output', () => {
    const renderRoute = readFileSync(
      'src/app/api/v1/render/route.ts',
      'utf-8',
    );
    expect(renderRoute).not.toContain('cdn.jsdelivr.net');
  });
});
