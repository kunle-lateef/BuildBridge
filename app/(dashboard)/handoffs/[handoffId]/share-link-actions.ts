'use server';

import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateShareToken } from '@/lib/share';
import type { ActionResult } from '@/lib/types';
import { createShareLinkSchema, revokeShareLinkSchema } from '@/lib/validators/share';

/**
 * Creates a share link and returns its raw token exactly once — it is
 * never persisted or retrievable again after this response, only its hash
 * (ShareLink.tokenReference). See lib/share.ts.
 */
export async function createShareLink(input: {
  handoffId: string;
  expiresInDays?: number;
}): Promise<ActionResult<{ shareLinkId: string; rawToken: string; expiresAt: string | null }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = createShareLinkSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, expiresInDays } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  // A handoff that's never been analyzed has zero issues by definition, so
  // the Critical-issue check below would pass trivially — this catches that
  // loophole explicitly rather than relying on "no criticals" to imply
  // "ready." See the developer's flow audit.
  if (handoff.readinessScore === null) {
    return {
      ok: false,
      error: { code: 'not_ready', message: 'Run analysis on this handoff before sharing it.' },
    };
  }

  // The readiness hard-gate has to be enforced here, not just displayed —
  // showing "Not ready" on the review page means nothing if sharing still
  // works anyway. See design-system.md's ReadinessScore spec: an unresolved
  // Critical issue must never read as "ready," which includes never letting
  // it ship to a developer.
  const unresolvedCriticalCount = await db.handoffIssue.count({
    where: { handoffId, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
  });

  if (unresolvedCriticalCount > 0) {
    return {
      ok: false,
      error: {
        code: 'not_ready',
        message: `This handoff has ${unresolvedCriticalCount} unresolved critical issue${unresolvedCriticalCount === 1 ? '' : 's'} — resolve them before sharing.`,
      },
    };
  }

  const { rawToken, tokenHash } = generateShareToken();
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const [shareLink] = await db.$transaction([
    db.shareLink.create({ data: { handoffId, tokenReference: tokenHash, expiresAt } }),
    db.handoff.update({ where: { id: handoffId }, data: { status: 'Shared' } }),
  ]);

  logger.info('share_link.created', { handoffId, shareLinkId: shareLink.id });
  revalidatePath(`/handoffs/${handoffId}`);

  return {
    ok: true,
    data: { shareLinkId: shareLink.id, rawToken, expiresAt: expiresAt?.toISOString() ?? null },
  };
}

/** Revokes a share link — the route handler checks `status` on every read, so this takes effect immediately. */
export async function revokeShareLink(shareLinkId: string): Promise<ActionResult<{ shareLinkId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = revokeShareLinkSchema.safeParse({ shareLinkId });

  if (!parsed.success) {
    return { ok: false, error: { code: 'invalid_input', message: 'Invalid input.' } };
  }

  const shareLink = await db.shareLink.findUnique({
    where: { id: parsed.data.shareLinkId },
    include: { handoff: true },
  });

  if (!shareLink || shareLink.handoff.ownerId !== session.user.id) {
    return notFoundError('Share link not found.');
  }

  await db.shareLink.update({
    where: { id: shareLink.id },
    data: { status: 'Revoked', revokedAt: new Date() },
  });

  logger.info('share_link.revoked', { handoffId: shareLink.handoffId, shareLinkId: shareLink.id });
  revalidatePath(`/handoffs/${shareLink.handoffId}`);

  return { ok: true, data: { shareLinkId: shareLink.id } };
}
