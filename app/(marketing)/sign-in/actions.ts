'use server';

// Imported from @auth/core directly (next-auth v5's own dependency, not a
// package.json dependency of ours) rather than from 'next-auth' — the
// top-level 'next-auth' export pulls in Next.js-runtime-specific modules
// that don't resolve in a plain Node/Vitest environment, whereas this is
// just the error class definitions.
import { AuthError } from '@auth/core/errors';

import { signIn } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import type { ActionResult } from '@/lib/types';
import { signInSchema } from '@/lib/validators/auth';

/**
 * Calls Auth.js's server-side signIn with redirect:false so failures come
 * back as a normal ActionResult instead of a framework redirect — the
 * client component handles navigating to /handoffs itself on success. See
 * lib/auth.ts's Credentials provider for what this actually verifies.
 */
export async function signInAction(
  _prevState: ActionResult<{ success: true }> | null,
  formData: FormData,
): Promise<ActionResult<{ success: true }>> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  // Slow down credential stuffing — see security.md's Rate Limiting
  // section, which names login alongside signup explicitly.
  const limit = await rateLimit(`sign-in:${parsed.data.email}`, 10, 15 * 60 * 1000);

  if (!limit.success) {
    return {
      ok: false,
      error: { code: 'rate_limited', message: 'Too many attempts. Try again in a few minutes.' },
    };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        error: { code: 'invalid_credentials', message: 'Incorrect email or password.' },
      };
    }
    throw error;
  }

  return { ok: true, data: { success: true } };
}
