import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import path from 'node:path';
import {
  collectCallExpressions,
  collectRouteFiles,
  callName,
  hasAnyCall,
  displayPath,
  exportedMethods,
  routeSourceFile,
} from '../utils/route-analysis';

const routeFiles = collectRouteFiles(path.resolve(process.cwd(), 'src', 'app', 'api', 'v1'));
const mutationMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const rateLimitCallNames = new Set(['enforceRateLimit', 'checkRateLimit']);
const enforceRateLimitCallNames = new Set(['enforceRateLimit']);
const rateLimitHeaderCallNames = new Set(['rateLimitHeaders']);
const auditCallNames = new Set<string>([
  'logAuditAction',
  'tx.auditLog.create',
  'tx.auditLog.createMany',
  'tx.auditLog.deleteMany',
]);

function exportedMutationMethods(sourceFile: ts.SourceFile): string[] {
  return exportedMethods(sourceFile, mutationMethods);
}

function checkRateLimitCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  return collectCallExpressions(sourceFile).filter((call) => callName(sourceFile, call) === 'checkRateLimit');
}

describe('route hardening invariants', () => {
  it('tracks API v1 route files', () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it('mutation routes must enforce a rate limit', () => {
    const missingRateLimit: string[] = [];

    for (const file of routeFiles) {
      const sourceFile = routeSourceFile(file);
      if (exportedMutationMethods(sourceFile).length === 0) continue;
      if (!hasAnyCall(sourceFile, rateLimitCallNames)) {
        missingRateLimit.push(displayPath(file));
      }
    }

    expect(missingRateLimit, `Missing rate limit in: ${missingRateLimit.join('\n')}`).toEqual([]);
  });

  it('mutation routes should log audit actions', () => {
    const missingAudit: string[] = [];

    for (const file of routeFiles) {
      const sourceFile = routeSourceFile(file);
      if (exportedMutationMethods(sourceFile).length === 0) continue;
      if (!hasAnyCall(sourceFile, auditCallNames)) {
        missingAudit.push(displayPath(file));
      }
    }

    expect(missingAudit, `Missing audit logging in: ${missingAudit.join('\n')}`).toEqual([]);
  });

  it('checkRateLimit calls should use centralized config + emit headers on manual branches', () => {
    const badNumericArgs: string[] = [];
    const missingHeaders: string[] = [];

    for (const file of routeFiles) {
      const sourceFile = routeSourceFile(file);
      const manualCalls = checkRateLimitCalls(sourceFile);
      if (manualCalls.length === 0) continue;

      if (
        !hasAnyCall(sourceFile, enforceRateLimitCallNames) &&
        !hasAnyCall(sourceFile, rateLimitHeaderCallNames)
      ) {
        missingHeaders.push(displayPath(file));
      }

      if (manualCalls.some((call) => call.arguments.slice(1).some((arg) => ts.isNumericLiteral(arg)))) {
        badNumericArgs.push(displayPath(file));
      }
    }

    expect(badNumericArgs, `checkRateLimit should use RATE_LIMITS config: ${badNumericArgs.join('\n')}`).toEqual([]);
    expect(missingHeaders, `checkRateLimit branch should include rateLimitHeaders: ${missingHeaders.join('\n')}`).toEqual([]);
  });
});
