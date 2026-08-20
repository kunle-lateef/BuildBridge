import { describe, expect, it } from 'vitest';

import { verifyOrigin } from './csrf';

// Compares Origin/Referer against the request's own Host header (not a
// fixed config value) — see csrf.ts for why. `host` defaults to
// 'localhost:3000' here to match how the app is normally reached in dev.
function requestWithOrigin(origin: string | null, opts: { referer?: string; host?: string | null } = {}): Request {
  const { referer, host = 'localhost:3000' } = opts;
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  if (referer) headers.set('referer', referer);
  if (host) headers.set('host', host);
  return new Request('http://localhost:3000/api/assistant', { method: 'POST', headers });
}

describe('verifyOrigin', () => {
  it('accepts a request whose Origin header matches the request Host header', () => {
    expect(verifyOrigin(requestWithOrigin('http://localhost:3000'))).toBe(true);
  });

  it('accepts a request reached via a different valid host alias (e.g. 127.0.0.1 instead of localhost), as long as Origin matches that same Host', () => {
    expect(verifyOrigin(requestWithOrigin('http://127.0.0.1:3000', { host: '127.0.0.1:3000' }))).toBe(true);
  });

  it('rejects a request with no Origin or Referer header at all', () => {
    expect(verifyOrigin(requestWithOrigin(null))).toBe(false);
  });

  it('rejects a request with no Host header', () => {
    expect(verifyOrigin(requestWithOrigin('http://localhost:3000', { host: null }))).toBe(false);
  });

  it('rejects a request whose Origin points at a different domain than the Host it was sent to', () => {
    expect(verifyOrigin(requestWithOrigin('https://evil.example.com'))).toBe(false);
  });

  it('falls back to the Referer header when Origin is absent', () => {
    expect(verifyOrigin(requestWithOrigin(null, { referer: 'http://localhost:3000/handoffs/abc' }))).toBe(true);
  });

  it('rejects a malformed Origin header rather than throwing', () => {
    expect(() => verifyOrigin(requestWithOrigin('not-a-url'))).not.toThrow();
    expect(verifyOrigin(requestWithOrigin('not-a-url'))).toBe(false);
  });
});
