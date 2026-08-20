'use server';

import bcrypt from 'bcryptjs';

import { signIn } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hashSecureToken } from '@/lib/tokens';
import type { ActionResult } from '@/lib/types';
import { resetPasswordSchema } from '@/lib/validators/auth';

const SALT_ROUNDS = 12;

export async function resetPassword(
  _prevState: ActionResult<{ reset: true }> | null,
  formData: FormData,
): Promise<ActionResult<{ reset: true }>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashSecureToken(token);

  const record = await db.verificationToken.findUnique({ where: { token: tokenHash } });

  if (!record || record.expires.getTime() < Date.now()) {
    return {
      ok: false,
      error: { code: 'invalid_token', message: 'This reset link is invalid or has expired.' },
    };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    await db.$transaction([
      // Also invalidates every existing session — a password change is
      // exactly the case sessionVersion exists for; see
      // app/(dashboard)/settings/actions.ts's signOutEverywhere.
      db.user.update({
        where: { email: record.identifier },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      // Single-use — the token is consumed whether or not this is the
      // first time it's been redeemed.
      db.verificationToken.delete({ where: { token: tokenHash } }),
    ]);
  } catch (error) {
    logger.error('auth.password_reset_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not reset your password.' } };
  }

  logger.info('auth.password_reset_succeeded', {});

  // Best-effort, same fallback as signUp: the password is already reset
  // either way. authorize() re-reads the user fresh, so this correctly
  // picks up the sessionVersion bump above rather than racing it.
  try {
    await signIn('credentials', { email: record.identifier, password, redirect: false });
  } catch (error) {
    logger.error('auth.password_reset_auto_sign_in_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  return { ok: true, data: { reset: true } };
}
