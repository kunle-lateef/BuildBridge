'use server';

import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

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
