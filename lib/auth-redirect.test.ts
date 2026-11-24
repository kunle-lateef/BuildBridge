import { describe, expect, it } from 'vitest';

import { DEFAULT_AFTER_SIGN_IN, safeCallbackPath } from './auth-redirect';

describe('safeCallbackPath', () => {
  it('keeps a same-site path with its query and hash', () => {
    expect(safeCallbackPath('/handoffs/abc?tab=screens#top')).toBe('/handoffs/abc?tab=screens#top');
  });

  it('falls back when there is no value', () => {
    expect(safeCallbackPath(null)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeCallbackPath('')).toBe(DEFAULT_AFTER_SIGN_IN);
  });

  it.each([
    'https://evil.example/handoffs',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'handoffs',
  ])('refuses %s', (value) => {
    expect(safeCallbackPath(value)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
