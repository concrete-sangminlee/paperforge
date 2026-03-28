import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const rm = readFileSync(join(process.cwd(), 'README.md'), 'utf-8');

describe('README quality', () => {
  it('has project title', () => { expect(rm).toContain('PaperForge'); });
  it('has tagline', () => { expect(rm).toContain('LaTeX'); });
  it('has tech stack badges', () => { expect(rm).toContain('shields.io'); });
  it('has live demo link', () => { expect(rm).toContain('projectlatexcompiler.vercel.app'); });
  it('has comparison table', () => { expect(rm).toContain('Overleaf'); });
  it('has features section', () => { expect(rm).toContain('## Features'); });
  it('has architecture diagram', () => { expect(rm).toContain('Architecture'); });
  it('has tech stack table', () => { expect(rm).toContain('## Tech Stack'); });
  it('has quick start', () => { expect(rm).toContain('Quick Start'); });
  it('has API reference', () => { expect(rm).toContain('API Reference'); });
  it('has deployment section', () => { expect(rm).toContain('Deployment'); });
  it('has security section', () => { expect(rm).toContain('Security'); });
  it('has roadmap', () => { expect(rm).toContain('Roadmap'); });
  it('has contributing link', () => { expect(rm).toContain('CONTRIBUTING.md'); });
  it('has license', () => { expect(rm).toContain('MIT License'); });
  it('has acknowledgements', () => { expect(rm).toContain('Acknowledgements'); });
  it('has footer stats', () => { expect(rm).toContain('tests'); });
  it('has page links', () => { expect(rm).toContain('Pricing'); });
});
