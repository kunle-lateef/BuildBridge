'use server';

import bcrypt from 'bcryptjs';

import { deleteHandoff } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/types';
import { changePasswordSchema, updateProfileSchema } from '@/lib/validators/settings';

const SALT_ROUNDS = 12;

/**
 * Incrementing sessionVersion invalidates every previously issued JWT
 * immediately, including the one making this request — see
 * User.sessionVersion in prisma/schema.prisma and lib/auth.ts's jwt
 * callback, which checks this value on every session read. This is the
 * control that mechanism exists for; see security.md's "logout invalidates
 * the session on the server side."
 */
export async function signOutEverywhere(): Promise<void> {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  logger.info('auth.signed_out_everywhere', { userId: session.user.id });

  await signOut({ redirectTo: '/' });
}

/**
 * Single global on/off — see User.emailNotificationsEnabled in
 * prisma/schema.prisma for why this isn't per-event-type.
 */
export async function updateEmailNotificationsPreference(enabled: boolean): Promise<ActionResult<{ enabled: boolean }>> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { emailNotificationsEnabled: enabled },
  });

  logger.info('user.email_notifications_preference_updated', { userId: session.user.id, enabled });

  return { ok: true, data: { enabled } };
}

/**
 * Name only — see the Settings page's Account section comment for why
 * email is deliberately not editable here yet (it's also the sign-in
 * credential, and would need its own verification step). lib/auth.ts's jwt
 * callback refreshes `name` from the DB on every session read, so this
 * takes effect immediately without a fresh sign-in.
 */
export async function updateProfile(
  _prevState: ActionResult<{ name: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ name: string }>> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const parsed = updateProfileSchema.safeParse({ name: formData.get('name') });

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  logger.info('user.profile_updated', { userId: session.user.id });

  return { ok: true, data: { name: parsed.data.name } };
}

/**
 * Requires the current password — proof the caller is really the account
 * holder, not just whoever has the current session, matching this app's
 * general "sensitive changes re-verify" posture (see DeleteAccountButton's
 * confirm-phrase gate). Bumping sessionVersion below invalidates every
 * session including this one (see signOutEverywhere's comment on why that
 * mechanism exists).
 *
 * Deliberately signs the current browser out too, rather than trying to
 * transparently re-establish it the way sign-up/reset-password do — calling
 * signIn() again from a Server Action while a session already exists here
 * does not reliably set a fresh cookie (verified: no Set-Cookie header comes
 * back on that response, unlike the logged-out cases), so the safer and
 * simpler behavior is one clean re-authentication with the new password,
 * same as every other device that gets signed out by this change.
 */
export async function changePassword(
  _prevState: ActionResult<{ changed: true }> | null,
  formData: FormData,
): Promise<ActionResult<{ changed: true }>> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmNewPassword: formData.get('confirmNewPassword'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const isCurrentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    return { ok: false, error: { code: 'invalid_credentials', message: 'Current password is incorrect.' } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, SALT_ROUNDS);

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  } catch (error) {
    logger.error('auth.password_change_failed', {
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not change your password.' } };
  }

  logger.info('auth.password_changed', { userId: session.user.id });

  // signOut's redirect throws (Next.js's redirect mechanism) — nothing
  // after this line runs on success. The sign-in page shows a confirmation
  // banner for this specific query param; see SignInForm.tsx.
  await signOut({ redirectTo: '/sign-in?passwordChanged=1' });

  return { ok: true, data: { changed: true } };
}

/**
 * Deletes every handoff the user owns (reusing deleteHandoff's own real,
 * cascading delete + storage cleanup — see that function's doc comment),
 * then the User row itself, then signs out. DesignerDecision/DesignerNote
 * rows still referencing this user as `creator` are already gone by the
 * time the User row is deleted, since every one of them is scoped to a
 * handoff this same user owns — see security.md's single-owner model.
 */
export async function deleteAccount(): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const userId = session.user.id;

  const handoffs = await db.handoff.findMany({ where: { ownerId: userId }, select: { id: true } });

  for (const handoff of handoffs) {
    const result = await deleteHandoff(handoff.id);

    if (!result.ok) {
      // Log and keep going — the user asked to delete their whole account;
      // one handoff failing to clean up shouldn't block deleting the rest.
      logger.error('account.delete_handoff_failed', { userId, handoffId: handoff.id });
    }
  }

  try {
    await db.user.delete({ where: { id: userId } });
  } catch (error) {
    logger.error('account.delete_failed', {
      userId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not delete your account.' } };
  }

  logger.info('account.deleted', { userId });

  await signOut({ redirectTo: '/' });

  return { ok: true, data: { deleted: true } };
}
