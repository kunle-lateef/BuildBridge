'use server';

import bcrypt from 'bcryptjs';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import type { ActionResult } from '@/lib/types';
import { signUpSchema } from '@/lib/validators/auth';

const SALT_ROUNDS = 12;

export async function signUp(
  _prevState: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_input',
        message: parsed.error.issues[0]?.message ?? 'Invalid input.',
      },
    };
  }

  const { name, email, password } = parsed.data;

  // Slow down automated account creation — see security.md's Rate Limiting
  // section.
  const limit = await rateLimit(`sign-up:${email}`, 5, 60 * 60 * 1000);

  if (!limit.success) {
    return {
      ok: false,
      error: { code: 'rate_limited', message: 'Too many attempts. Try again later.' },
    };
  }

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // Don't reveal whether the account already exists — see security.md's
    // guidance against confirming another user's data, applied to
    // enumeration here.
    return {
      ok: false,
      error: { code: 'invalid_input', message: 'Could not create an account with that email.' },
    };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    await db.user.create({ data: { name, email, passwordHash } });
  } catch (error) {
    logger.error('auth.sign_up.failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return {
      ok: false,
      error: { code: 'server_error', message: 'Could not create your account.' },
    };
  }

  logger.info('auth.sign_up.succeeded', {});

  return { ok: true, data: { email } };
}
