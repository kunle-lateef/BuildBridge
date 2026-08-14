import { describe, expect, it } from 'vitest';

import { verifyOrigin } from './csrf';

// lib/env.ts's NEXT_PUBLIC_APP_URL is "http://localhost:3000" per .env —
// loaded by vitest.setup.ts.

function requestWithOrigin(origin: string | null, referer?: string): Request {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  if (referer) headers.set('referer', referer);
  return new Request('http://localhost:3000/api/assistant', { method: 'POST', headers });
}

describe('verifyOrigin', () => {
  it('accepts a request whose Origin header matches the app domain', () => {
    expect(verifyOrigin(requestWithOrigin('http://localhost:3000'))).toBe(true);
  });

  it('rejects a request with no Origin or Referer header at all', () => {
    expect(verifyOrigin(requestWithOrigin(null))).toBe(false);
  });

  it('rejects a request whose Origin points at a different domain', () => {
    expect(verifyOrigin(requestWithOrigin('https://evil.example.com'))).toBe(false);
  });

  it('falls back to the Referer header when Origin is absent', () => {
    expect(verifyOrigin(requestWithOrigin(null, 'http://localhost:3000/handoffs/abc'))).toBe(true);
  });

  it('rejects a malformed Origin header rather than throwing', () => {
    expect(() => verifyOrigin(requestWithOrigin('not-a-url'))).not.toThrow();
    expect(verifyOrigin(requestWithOrigin('not-a-url'))).toBe(false);
  });
});
