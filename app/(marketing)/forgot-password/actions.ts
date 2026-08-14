'use server';

import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { generateSecureToken } from '@/lib/tokens';
import type { ActionResult } from '@/lib/types';
import { requestPasswordResetSchema } from '@/lib/validators/auth';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Always returns the same success response whether or not the account
 * exists — see security.md's guidance against confirming another user's
 * resource exists, applied here to email enumeration. Rate-limited per
 * security.md's explicit "password reset requests" line item.
 */
export async function requestPasswordReset(
  _prevState: ActionResult<{ requested: true }> | null,
  formData: FormData,
): Promise<ActionResult<{ requested: true }>> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { email } = parsed.data;

  const limit = await rateLimit(`password-reset:${email}`, 3, 60 * 60 * 1000);

  if (!limit.success) {
    // Still the generic response — a rate-limit-specific error would leak
    // that this email has been tried before.
    return { ok: true, data: { requested: true } };
  }

  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    const { rawToken, tokenHash } = generateSecureToken();

    // A fresh request supersedes any earlier unused token for this email
    // rather than accumulating valid tokens.
    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.verificationToken.create({
      data: { identifier: email, token: tokenHash, expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);

    logger.info('auth.password_reset_requested', { userId: user.id });
  }

  return { ok: true, data: { requested: true } };
}
