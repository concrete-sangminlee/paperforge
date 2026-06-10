import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

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

function routeSourceFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

const routeFiles = collectRouteFiles(resolve(process.cwd(), 'src/app/api/v1'));
const mutationMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const rateLimitCallNames = new Set(['enforceRateLimit', 'checkRateLimit']);
const enforceRateLimitCallNames = new Set(['enforceRateLimit']);
const rateLimitHeaderCallNames = new Set(['rateLimitHeaders']);
const auditCallNames = new Set([
  'logAuditAction',
  'tx.auditLog.create',
  'tx.auditLog.createMany',
  'tx.auditLog.deleteMany',
]);

function displayPath(filePath: string): string {
  return relative(process.cwd(), filePath).split(sep).join('/');
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function exportedMutationMethods(sourceFile: ts.SourceFile): string[] {
  const methods: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;

    if (ts.isFunctionDeclaration(statement) && statement.name && mutationMethods.has(statement.name.text)) {
      methods.push(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && mutationMethods.has(declaration.name.text)) {
          methods.push(declaration.name.text);
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.exportClause) {
      if (!ts.isNamedExports(statement.exportClause)) continue;

      for (const specifier of statement.exportClause.elements) {
        if (mutationMethods.has(specifier.name.text)) {
          methods.push(specifier.name.text);
        }
      }
    }
  }

  return methods;
}

function collectCallExpressions(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function callName(sourceFile: ts.SourceFile, call: ts.CallExpression): string {
  return call.expression.getText(sourceFile);
}

function hasAnyCall(sourceFile: ts.SourceFile, names: Set<string>): boolean {
  return collectCallExpressions(sourceFile).some((call) => names.has(callName(sourceFile, call)));
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
