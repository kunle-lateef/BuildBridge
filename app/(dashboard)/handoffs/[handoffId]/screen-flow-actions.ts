'use server';

import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/types';
import { createScreenFlowSchema } from '@/lib/validators/screenFlow';

/**
 * Records "this screen leads to that screen" — always designer-authored,
 * never AI-generated (see ScreenFlow's schema comment). Both screens are
 * verified to belong to the caller's own handoff, not just trusted from
 * the client, same as every other ownership check in this feature area.
 */
export async function createScreenFlow(input: {
  handoffId: string;
  sourceScreenId: string;
  targetScreenId: string;
  label?: string;
}): Promise<ActionResult<{ screenFlowId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = createScreenFlowSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, sourceScreenId, targetScreenId, label } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const screens = await db.screen.findMany({
    where: { id: { in: [sourceScreenId, targetScreenId] }, handoffId },
    select: { id: true },
  });

  if (screens.length !== 2) {
    return notFoundError('One or both screens could not be found.');
  }

  const flow = await db.screenFlow.create({
    data: { handoffId, sourceScreenId, targetScreenId, label, createdBy: session.user.id },
  });

  logger.info('handoff.screen_flow.created', { handoffId, screenFlowId: flow.id });
  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { screenFlowId: flow.id } };
}

export async function deleteScreenFlow(screenFlowId: string): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const flow = await db.screenFlow.findUnique({ where: { id: screenFlowId } });

  if (!flow) {
    return notFoundError('Flow not found.');
  }

  const handoff = await db.handoff.findUnique({ where: { id: flow.handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Flow not found.');
  }

  await db.screenFlow.delete({ where: { id: screenFlowId } });

  logger.info('handoff.screen_flow.deleted', { handoffId: flow.handoffId, screenFlowId });
  revalidatePath(`/handoffs/${flow.handoffId}`);

  return { ok: true, data: { deleted: true } };
}
