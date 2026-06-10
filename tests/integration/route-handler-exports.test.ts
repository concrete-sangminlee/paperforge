import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

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

const exportMatch = /export\s+(?:async\s+)?(function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
const exportDefaultMatch = /\bexport\s+default\b/;

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

describe('route handler exports', () => {
  it('should only export route handlers and supported segment config', () => {
    const routeFiles = collectRouteFiles(APP_ROOT);
    const violations: string[] = [];

    for (const file of routeFiles) {
      const source = readFileSync(file, 'utf8');
      if (exportDefaultMatch.test(source)) {
        violations.push(`${path.relative(process.cwd(), file)}: default export`);
      }

      exportMatch.lastIndex = 0;
      let match = exportMatch.exec(source);
      while (match) {
        const kind = match[1];
        const name = match[2];
        if (name && !allowedRouteExports.has(name)) {
          violations.push(`${path.relative(process.cwd(), file)}: ${kind} ${name}`);
        }

        match = exportMatch.exec(source);
      }
    }

    expect(violations).toEqual([]);
  });
});
