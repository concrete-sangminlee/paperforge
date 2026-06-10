import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const APP_ROOT = path.resolve(process.cwd(), 'src', 'app');

const allowedRouteExports = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE',
  'CONNECT',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
  'experimental_ppr',
  'config',
  'generateStaticParams',
]);

function collectRouteFiles(dir: string, output: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(fullPath, output);
      continue;
    }

    if (entry.isFile() && entry.name === 'route.ts') {
      output.push(fullPath);
    }
  }
  return output;
}

function relativePath(file: string) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

function hasExportModifier(node: ts.Node) {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function hasDefaultModifier(node: ts.Node) {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
  );
}

function collectBindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];

  return name.elements.flatMap((element) => {
    if (ts.isOmittedExpression(element)) return [];
    return collectBindingNames(element.name);
  });
}

function exportedDeclarationNames(statement: ts.Statement): string[] {
  if (!hasExportModifier(statement)) return [];

  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) {
    return statement.name ? [statement.name.text] : ['default'];
  }

  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => collectBindingNames(declaration.name));
  }

  return [];
}

function collectRouteExportViolations(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const violations: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      violations.push(`${relativePath(file)}: default export`);
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;

      if (!statement.exportClause) {
        violations.push(`${relativePath(file)}: wildcard export`);
        continue;
      }

      if (ts.isNamedExports(statement.exportClause)) {
        for (const specifier of statement.exportClause.elements) {
          const name = specifier.name.text;
          if (!allowedRouteExports.has(name)) {
            violations.push(`${relativePath(file)}: re-export ${name}`);
          }
        }
      }
      continue;
    }

    if (hasDefaultModifier(statement)) {
      violations.push(`${relativePath(file)}: default export`);
      continue;
    }

    for (const name of exportedDeclarationNames(statement)) {
      if (!allowedRouteExports.has(name)) {
        violations.push(`${relativePath(file)}: export ${name}`);
      }
    }
  }

  return violations;
}

describe('route handler exports', () => {
  it('should only export route handlers and supported segment config', () => {
    const routeFiles = collectRouteFiles(APP_ROOT);
    const violations = routeFiles.flatMap(collectRouteExportViolations);

    expect(routeFiles.length).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
});
