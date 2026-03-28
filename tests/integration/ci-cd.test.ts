import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('CI/CD & GitHub config', () => {
  it('CI workflow has lint job', () => {
    const c = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf-8');
    expect(c).toContain('next lint');
  });
  it('CI workflow has test job', () => {
    const c = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf-8');
    expect(c).toContain('vitest run');
  });
  it('CI workflow has build job', () => {
    const c = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf-8');
    expect(c).toContain('npm run build');
  });
  it('Dependabot configured for npm', () => {
    const c = readFileSync(join(process.cwd(), '.github/dependabot.yml'), 'utf-8');
    expect(c).toContain('npm');
  });
  it('Bug report template exists', () => {
    expect(existsSync(join(process.cwd(), '.github/ISSUE_TEMPLATE/bug_report.yml'))).toBe(true);
  });
  it('Feature request template exists', () => {
    expect(existsSync(join(process.cwd(), '.github/ISSUE_TEMPLATE/feature_request.yml'))).toBe(true);
  });
  it('PR template exists', () => {
    expect(existsSync(join(process.cwd(), '.github/pull_request_template.md'))).toBe(true);
  });
  it('SECURITY.md exists', () => {
    expect(existsSync(join(process.cwd(), 'SECURITY.md'))).toBe(true);
  });
  it('CONTRIBUTING.md exists', () => {
    expect(existsSync(join(process.cwd(), 'CONTRIBUTING.md'))).toBe(true);
  });
  it('CHANGELOG.md exists', () => {
    expect(existsSync(join(process.cwd(), 'CHANGELOG.md'))).toBe(true);
  });
});
