'use server';

import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/types';
import { replyToDeveloperFlagSchema, updateDeveloperFlagStatusSchema } from '@/lib/validators/share';

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

/**
 * "Reply and resolve" (Figma "Phone triage — 2"): stores the designer's
 * reply and resolves the flag in one write. The developer sees the reply
 * under "Your flags" through the tracking route. Same owner check as
 * updateDeveloperFlagStatus; the developer's message is never touched.
 */
export async function replyToDeveloperFlag(
  input: unknown,
): Promise<ActionResult<{ developerFlagId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = replyToDeveloperFlagSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { developerFlagId, reply } = parsed.data;

  const flag = await db.developerFlag.findUnique({
    where: { id: developerFlagId },
    select: { handoffId: true, handoff: { select: { ownerId: true } } },
  });

  if (!flag || flag.handoff.ownerId !== session.user.id) {
    return notFoundError('Flag not found.');
  }

  await db.developerFlag.update({
    where: { id: developerFlagId },
    data: { reply, repliedAt: new Date(), status: 'Resolved' },
  });

  logger.info('handoff.developer_flag.replied', { handoffId: flag.handoffId, developerFlagId });
  revalidatePath(`/handoffs/${flag.handoffId}`);

  return { ok: true, data: { developerFlagId } };
}
