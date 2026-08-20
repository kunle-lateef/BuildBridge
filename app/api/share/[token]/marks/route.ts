import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { resolveFinding } from '@/lib/decisions';
import { logger } from '@/lib/logger';
import { enqueueNotification } from '@/lib/notification-queue';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { resolveShareLink } from '@/lib/share';
import { shareTokenSchema, submitImplementationMarkSchema } from '@/lib/validators/share';

type RouteParams = {
  params: Promise<{ token: string }>;
};

const notFound = () =>
  NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });

/**
 * Public, POST-only — a sibling write path to flags/route.ts, not a reuse
 * of it (findingType/findingReference are required here, and HandoffIssue
 * is excluded — see lib/validators/share.ts's submitImplementationMarkSchema
 * and prisma/schema.prisma's ImplementationMark model for why this is a
 * distinct concept from DeveloperFlag). Same fail-closed-404 pattern, same
 * "no BuildBridge session, the share token is the entire credential" model.
 *
 * Rate limits are deliberately more generous than flags/route.ts's —
 * marking is a real review-pass action (a developer might mark 30-80
 * findings in one session), not occasional free-text submission, and
 * marking is non-destructive (no unmark in v1, so the worst case from a
 * burst is noise, not corruption).
 */
export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const { token } = await params;
  const parsedToken = shareTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return notFound();
  }

  const shareLink = await resolveShareLink(parsedToken.data);

  if (!shareLink) {
    return notFound();
  }

  const ipLimit = await rateLimit(`share-link-mark:${clientIp(request)}`, 30, 60 * 1000);
  if (!ipLimit.success) {
    return NextResponse.json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests.' } }, { status: 429 });
  }

  const linkLimit = await rateLimit(`share-link-mark:link:${shareLink.id}`, 300, 60 * 60 * 1000);
  if (!linkLimit.success) {
    return NextResponse.json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests.' } }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'invalid_input', message: 'Malformed request body.' } }, { status: 400 });
  }

  const parsed = submitImplementationMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_input', message: 'Malformed implementation mark.' } },
      { status: 400 },
    );
  }

  const { findingType, findingReference, markedByName } = parsed.data;

  const finding = await resolveFinding(findingType, findingReference);

  // Same cross-handoff check flags/route.ts uses — a crafted request could
  // otherwise use one legitimately-held share link to mark a finding on an
  // unrelated handoff.
  if (!finding || finding.handoffId !== shareLink.handoffId) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_input', message: 'That finding does not belong to this handoff.' } },
      { status: 400 },
    );
  }

  // Idempotent: first mark wins. `update: {}` means a re-mark of the same
  // finding is a no-op, not an overwrite — the original markedByName/
  // createdAt survive. Atomic on Postgres (single INSERT ... ON CONFLICT),
  // no race window between a concurrent pair of requests.
  const mark = await db.implementationMark.upsert({
    where: { findingType_findingReference: { findingType, findingReference } },
    create: { handoffId: shareLink.handoffId, shareLinkId: shareLink.id, findingType, findingReference, markedByName },
    update: {},
  });

  logger.info('share.implementation_marked', { handoffId: shareLink.handoffId, shareLinkId: shareLink.id, findingType, findingReference });

  // Non-blocking — a Redis hiccup here must never fail this public
  // submission. See app/api/share/[token]/flags/route.ts's identical
  // treatment and lib/ai/pipeline.ts's, where this pattern originates.
  try {
    await enqueueNotification({ kind: 'implementation-marked', implementationMarkId: mark.id });
  } catch (error) {
    logger.error('share.notification_enqueue_failed', {
      implementationMarkId: mark.id,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  return NextResponse.json({ ok: true, data: { findingType, findingReference } }, { status: 201 });
}
