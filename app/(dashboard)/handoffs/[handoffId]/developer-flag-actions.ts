'use server';

import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/types';
import { updateDeveloperFlagStatusSchema } from '@/lib/validators/share';

/**
 * The only way a DeveloperFlag's status ever changes — the message itself
 * is immutable once submitted (see prisma/schema.prisma's DeveloperFlag
 * comment). Only the designer who owns the handoff can transition it;
 * there is no public path that reaches this action.
 */
export async function updateDeveloperFlagStatus(
  input: unknown,
): Promise<ActionResult<{ developerFlagId: string; status: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = updateDeveloperFlagStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { developerFlagId, status } = parsed.data;

  const flag = await db.developerFlag.findUnique({ where: { id: developerFlagId } });

  if (!flag) {
    return notFoundError('Flag not found.');
  }

  const handoff = await db.handoff.findUnique({ where: { id: flag.handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Flag not found.');
  }

  await db.developerFlag.update({ where: { id: developerFlagId }, data: { status } });

  logger.info('handoff.developer_flag.status_updated', { handoffId: flag.handoffId, developerFlagId, status });
  revalidatePath(`/handoffs/${flag.handoffId}`);

  return { ok: true, data: { developerFlagId, status } };
}
