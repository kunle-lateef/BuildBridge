/**
 * Where sign-in sends people afterwards, and how the sign-in page knows a
 * session ended (Figma `02 — Auth` → "Sign in — session expired").
 */

export const DEFAULT_AFTER_SIGN_IN = '/handoffs';

/**
 * Set at sign-in, removed at sign-out. It holds no identity, only "this
 * browser was signed in", so that when a session ends on its own (expiry, or
 * a forced sign-out) the sign-in page can say so instead of looking like a
 * first visit. The session cookie alone can't tell: the browser drops it
 * when it expires.
 */
export const SIGNED_IN_HINT_COOKIE = 'bb-signed-in';
export const SIGNED_IN_HINT_MAX_AGE = 60 * 60 * 24 * 365;

/** `?reason=` value the middleware adds when a session ended. */
export const SESSION_EXPIRED_REASON = 'session_expired';

/**
 * Only a same-site path is followed after sign-in, so a crafted
 * `?callbackUrl=https://elsewhere` (or `//elsewhere`, `/\elsewhere`) can't
 * turn the sign-in page into an open redirect. Anything else falls back to
 * the dashboard.
 */
export function safeCallbackPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_AFTER_SIGN_IN;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_AFTER_SIGN_IN;
  // Control characters (tabs, newlines) are stripped by URL parsers and can
  // turn "/\t/evil" into "//evil".
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AFTER_SIGN_IN;
  try {
    const url = new URL(value, 'http://same.invalid');
    if (url.origin !== 'http://same.invalid') return DEFAULT_AFTER_SIGN_IN;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
}
