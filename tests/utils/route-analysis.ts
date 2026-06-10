import { readdirSync, readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import ts from 'typescript';

const routeFileName = 'route.ts';

export function collectRouteFiles(dir: string, output: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(fullPath, output);
      continue;
    }

    if (entry.isFile() && entry.name === routeFileName) {
      output.push(fullPath);
    }
  }
  return output;
}

export function displayPath(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

export function routeSourceFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

export function collectCallExpressions(sourceFile: ts.SourceFile): ts.CallExpression[] {
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

export function callName(sourceFile: ts.SourceFile, call: ts.CallExpression): string {
  return call.expression.getText(sourceFile);
}

export function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

export function hasDefaultModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
  );
}

export function collectBindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];

  return name.elements.flatMap((element) => {
    if (ts.isOmittedExpression(element)) return [];
    return collectBindingNames(element.name);
  });
}

export function exportedDeclarationNames(statement: ts.Statement): string[] {
  if (!hasExportModifier(statement)) return [];

  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  ) {
    return statement.name ? [statement.name.text] : ['default'];
  }

  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => collectBindingNames(declaration.name));
  }

  return [];
}

export function hasAnyCall(sourceFile: ts.SourceFile, names: Set<string>): boolean {
  return collectCallExpressions(sourceFile).some((call) => names.has(callName(sourceFile, call)));
}

export function exportedMethods(sourceFile: ts.SourceFile, allowedMethods: Set<string>): string[] {
  const methods: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;

    if (ts.isFunctionDeclaration(statement) && statement.name && allowedMethods.has(statement.name.text)) {
      methods.push(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && allowedMethods.has(declaration.name.text)) {
          methods.push(declaration.name.text);
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.exportClause) {
      if (!ts.isNamedExports(statement.exportClause)) continue;

      for (const specifier of statement.exportClause.elements) {
        if (allowedMethods.has(specifier.name.text)) {
          methods.push(specifier.name.text);
        }
      }
    }
  }

  return methods;
}
