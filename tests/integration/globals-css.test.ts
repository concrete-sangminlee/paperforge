import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf-8');

describe('globals.css features', () => {
  it('has smooth scroll', () => { expect(css).toContain('scroll-behavior: smooth'); });
  it('has custom animations', () => { expect(css).toContain('@keyframes'); });
  it('has glass morphism', () => { expect(css).toContain('.glass'); });
  it('has text gradient', () => { expect(css).toContain('.text-gradient'); });
  it('has dot pattern', () => { expect(css).toContain('.bg-dot-pattern'); });
  it('has custom scrollbar', () => { expect(css).toContain('::-webkit-scrollbar'); });
});
