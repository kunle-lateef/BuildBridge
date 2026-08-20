'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/lib/auth';
import * as notifications from '@/lib/notifications';
import type { ActionResult } from '@/lib/types';

/**
 * Thin auth wrapper around lib/notifications.ts's DB-touching functions —
 * follows the same auth() -> ownership-check (inside the lib function) ->
 * revalidatePath -> ActionResult shape every other action in this codebase
 * uses. Notifications aren't handoff-scoped, so this lives in its own
 * feature-area actions.ts rather than app/(dashboard)/handoffs/[handoffId]/actions.ts.
 */
export async function markNotificationRead(notificationId: string): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const result = await notifications.markNotificationRead(session.user.id, notificationId);

  if (result.ok) {
    revalidatePath('/', 'layout');
  }

  return result;
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ count: number }>> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const result = await notifications.markAllNotificationsRead(session.user.id);

  if (result.ok) {
    revalidatePath('/', 'layout');
  }

  return result;
}
