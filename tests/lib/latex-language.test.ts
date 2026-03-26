import { describe, it, expect } from 'vitest';
import { latexLanguage } from '@/lib/latex-language';

describe('latexLanguage', () => {
  it('is defined as a StreamLanguage', () => {
    expect(latexLanguage).toBeDefined();
    expect(latexLanguage.name).toBeDefined();
  });
});
