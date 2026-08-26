'use server';

import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/types';
import { addDesignerNoteSchema, editDesignerNoteSchema } from '@/lib/validators/note';

/**
 * The ownership-check pattern used throughout this feature area: check
 * `handoff.ownerId === session.userId` explicitly, never infer it from the
 * route/input shape — see security.md's "Ownership checks are explicit, not
 * implied by URL shape." Returns the same not_found error whether the
 * handoff doesn't exist or belongs to someone else, so a crafted ID can't
 * be used to probe for existence.
 */
export async function addDesignerNote(input: {
  handoffId: string;
  content: string;
  screenId?: string;
  componentId?: string;
}): Promise<ActionResult<{ noteId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = addDesignerNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, content, screenId, componentId } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const note = await db.designerNote.create({
    data: { handoffId, content, screenId, componentId, createdBy: session.user.id },
  });

  logger.info('handoff.note.added', { handoffId, noteId: note.id });
  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { noteId: note.id } };
}

export async function editDesignerNote(input: {
  noteId: string;
  content: string;
}): Promise<ActionResult<{ noteId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = editDesignerNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const note = await db.designerNote.findUnique({
    where: { id: parsed.data.noteId },
    include: { handoff: true },
  });

  if (!note || note.handoff.ownerId !== session.user.id) {
    return notFoundError('Note not found.');
  }

  await db.designerNote.update({ where: { id: note.id }, data: { content: parsed.data.content } });

  logger.info('handoff.note.edited', { handoffId: note.handoffId, noteId: note.id });
  revalidatePath(`/handoffs/${note.handoffId}`);

  return { ok: true, data: { noteId: note.id } };
}
