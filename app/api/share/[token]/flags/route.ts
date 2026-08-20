import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { resolveFinding } from '@/lib/decisions';
import { logger } from '@/lib/logger';
import { enqueueNotification } from '@/lib/notification-queue';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { resolveShareLink } from '@/lib/share';
import { generateSecureToken } from '@/lib/tokens';
import { shareTokenSchema, submitDeveloperFlagSchema } from '@/lib/validators/share';

type RouteParams = {
  params: Promise<{ token: string }>;
};

const notFound = () =>
  NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });

/**
 * Public, POST-only — the one scoped exception to "no public writes" (see
 * architecture.md's Data Flow section and security.md's CSRF section for
 * why this needs no CSRF check but does need its own rate limits). Same
 * fail-closed-404 pattern as the sibling GET route for an invalid, expired,
 * or revoked token. No BuildBridge session; the share token is the entire
 * credential.
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

  // Per-IP first (cheapest, blocks a single abusive source fast), then
  // per-link (catches a leaked link being spammed from many different IPs
  // once it circulates beyond the intended developer) — see security.md's
  // Rate Limiting section.
  const ipLimit = await rateLimit(`share-link-write:${clientIp(request)}`, 5, 60 * 1000);
  if (!ipLimit.success) {
    return NextResponse.json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests.' } }, { status: 429 });
  }

  const linkLimit = await rateLimit(`share-link-write:link:${shareLink.id}`, 20, 60 * 60 * 1000);
  if (!linkLimit.success) {
    return NextResponse.json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests.' } }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'invalid_input', message: 'Malformed request body.' } }, { status: 400 });
  }

  const parsed = submitDeveloperFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_input', message: 'Malformed flag submission.' } },
      { status: 400 },
    );
  }

  const { kind, message, submittedByName, findingType, findingReference } = parsed.data;

  if (findingType && findingReference) {
    const finding = await resolveFinding(findingType, findingReference);

    // A crafted request could otherwise use one legitimately-held share
    // link as a key to plant a flag against a finding on an unrelated
    // handoff — see security.md's flag-endpoint note.
    if (!finding || finding.handoffId !== shareLink.handoffId) {
      return NextResponse.json(
        { ok: false, error: { code: 'invalid_input', message: 'That finding does not belong to this handoff.' } },
        { status: 400 },
      );
    }
  }

  // Lets the anonymous submitter check this flag's status later without an
  // account — see the field's comment in prisma/schema.prisma for why a
  // Prisma cuid() isn't random enough to serve as that capability itself.
  const { rawToken: trackingToken, tokenHash: trackingTokenHash } = generateSecureToken();

  const flag = await db.developerFlag.create({
    data: {
      handoffId: shareLink.handoffId,
      shareLinkId: shareLink.id,
      kind,
      message,
      submittedByName,
      findingType,
      findingReference,
      trackingTokenHash,
    },
  });

  logger.info('share.developer_flag_submitted', { handoffId: shareLink.handoffId, shareLinkId: shareLink.id, kind });

  // Non-blocking — a Redis hiccup here must never fail this public
  // submission. See lib/ai/pipeline.ts's identical treatment.
  try {
    await enqueueNotification({ kind: 'developer-flag-received', developerFlagId: flag.id });
  } catch (error) {
    logger.error('share.notification_enqueue_failed', {
      developerFlagId: flag.id,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  return NextResponse.json({ ok: true, data: { id: flag.id, trackingToken } }, { status: 201 });
}
