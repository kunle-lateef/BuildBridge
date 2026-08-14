import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

/**
 * Shared bearer-token pattern: a random raw token is handed to the user
 * exactly once; only its SHA-256 hash is ever persisted, so a database
 * read can never recover a usable token. Used by both share links
 * (lib/share.ts) and password-reset tokens (lib/validators/auth.ts's
 * reset flow) — see security.md's "a share-link token is effectively a
 * bearer credential," which applies equally to a reset token.
 */
export function generateSecureToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
  return { rawToken, tokenHash: hashSecureToken(rawToken) };
}

export function hashSecureToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
