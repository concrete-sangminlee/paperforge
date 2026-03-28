import { describe, it, expect } from 'vitest';

// Test the fetcher unwrap logic used in projects page
function unwrapResponse(data: unknown) {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: unknown }).data;
  }
  return data;
}

describe('fetcher response unwrap', () => {
  it('unwraps { data: [...] }', () => {
    expect(unwrapResponse({ success: true, data: [1, 2] })).toEqual([1, 2]);
  });
  it('passes through plain array', () => {
    expect(unwrapResponse([1, 2])).toEqual([1, 2]);
  });
  it('unwraps { data: null }', () => {
    expect(unwrapResponse({ success: true, data: null })).toBeNull();
  });
  it('passes through plain object', () => {
    expect(unwrapResponse({ id: '1' })).toEqual({ id: '1' });
  });
});
