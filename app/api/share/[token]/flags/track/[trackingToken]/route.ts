import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { resolveShareLink } from '@/lib/share';
import { hashSecureToken } from '@/lib/tokens';
import { shareTokenSchema } from '@/lib/validators/share';

type RouteParams = {
  params: Promise<{ token: string; trackingToken: string }>;
};

const notFound = () =>
  NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });

/**
 * Public, GET-only, read-only — lets an anonymous developer check the
 * status of a flag they submitted, without an account. Two-factor
 * authorization, same shape as the POST route's own cross-handoff check:
 * BOTH a valid, active share token for the handoff AND the flag's own
 * tracking token are required. Neither alone is enough — a valid share
 * token only proves "I can view this handoff," not "I submitted this
 * specific flag." Rate-limited by middleware's existing blanket
 * `share-link-read` limit on `/api/share/:path*`; no dedicated limiter
 * needed for a read.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { token, trackingToken } = await params;

  const parsedToken = shareTokenSchema.safeParse(token);
  const parsedTrackingToken = shareTokenSchema.safeParse(trackingToken);

  if (!parsedToken.success || !parsedTrackingToken.success) {
    return notFound();
  }

  const shareLink = await resolveShareLink(parsedToken.data);

  if (!shareLink) {
    return notFound();
  }

  const flag = await db.developerFlag.findUnique({
    where: { trackingTokenHash: hashSecureToken(parsedTrackingToken.data) },
    select: { handoffId: true, status: true, kind: true, createdAt: true },
  });

  if (!flag || flag.handoffId !== shareLink.handoffId) {
    return notFound();
  }

  return NextResponse.json({ ok: true, data: { status: flag.status, kind: flag.kind, createdAt: flag.createdAt } });
}
