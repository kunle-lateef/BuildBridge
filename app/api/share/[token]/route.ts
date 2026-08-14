import { NextResponse } from 'next/server';

import { buildDeveloperProjection, resolveShareLink } from '@/lib/share';
import { shareTokenSchema } from '@/lib/validators/share';

type RouteParams = {
  params: Promise<{ token: string }>;
};

/**
 * Public, read-only, GET-only boundary — no BuildBridge session, no CSRF
 * protection needed since nothing here mutates state (security.md's CSRF
 * section). Rate-limited in middleware.ts. Returns only the developer
 * projection for the single handoff this token is scoped to — never the
 * designer review data shape, never any other handoff. An invalid, revoked,
 * or expired token gets the same 404 either way; resolveShareLink is
 * deliberately uniform so a failed lookup can't be used to distinguish
 * "never existed" from "existed but was revoked."
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { token } = await params;
  const parsedToken = shareTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });
  }

  const shareLink = await resolveShareLink(parsedToken.data);

  if (!shareLink) {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });
  }

  const projection = await buildDeveloperProjection(shareLink.handoffId);

  return NextResponse.json({ ok: true, data: projection }, { status: 200 });
}
