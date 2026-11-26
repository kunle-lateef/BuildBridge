'use server';

import { z } from 'zod';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendContinueReviewEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { countValuesToReview } from '@/lib/review-progress';
import type { ActionResult } from '@/lib/types';

const emailReviewLinkSchema = z.object({ handoffId: z.string().min(1) });

/**
 * Phone triage's "Email me a link" (Figma "Phone triage — 0" and "— 3"):
 * emails the signed-in designer, and only them, a link to this handoff's
 * Review page to finish the values on a computer. Rate-limited so a phone
 * tap can't become a stream of emails.
 */
export async function emailReviewLink(input: unknown): Promise<ActionResult<{ valuesLeft: number }>> {
  const session = await auth();

  if (!session?.user?.email) {
    return unauthenticatedError();
  }

  const parsed = emailReviewLinkSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: { code: 'invalid_input', message: 'Invalid input.' } };
  }

  const { handoffId } = parsed.data;
  const handoff = await db.handoff.findUnique({ where: { id: handoffId }, select: { ownerId: true, name: true } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const limit = await rateLimit(`review-link-email:${session.user.id}`, 3, 60 * 60 * 1000);

  if (!limit.success) {
    return {
      ok: false,
      error: { code: 'rate_limited', message: 'We’ve sent a few already. Check your inbox, or try again in an hour.' },
    };
  }

  const valuesLeft = await countValuesToReview(handoffId);

  await sendContinueReviewEmail(session.user.email, {
    handoffName: handoff.name,
    valuesLeft,
    reviewUrl: `${env.NEXT_PUBLIC_APP_URL}/handoffs/${handoffId}`,
  });

  logger.info('handoff.review_link.emailed', { handoffId });

  return { ok: true, data: { valuesLeft } };
}
