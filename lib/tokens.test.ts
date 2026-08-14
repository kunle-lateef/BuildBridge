import { describe, expect, it } from 'vitest';

import { generateSecureToken, hashSecureToken } from './tokens';

describe('generateSecureToken / hashSecureToken', () => {
  it("produces a token whose hash matches the returned hash and is reproducible via hashSecureToken alone (proves the caller doesn't need to store the raw token)", () => {
    const { rawToken, tokenHash } = generateSecureToken();

    expect(hashSecureToken(rawToken)).toBe(tokenHash);
  });

  it('never returns the same raw token twice', () => {
    const a = generateSecureToken();
    const b = generateSecureToken();

    expect(a.rawToken).not.toBe(b.rawToken);
  });

  it('the hash never contains or trivially reveals the raw token', () => {
    const { rawToken, tokenHash } = generateSecureToken();

    expect(tokenHash).not.toContain(rawToken);
    expect(tokenHash).not.toBe(rawToken);
  });
});
