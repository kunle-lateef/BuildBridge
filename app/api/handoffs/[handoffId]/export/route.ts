import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildMarkdownExport } from '@/lib/export/markdown';
import { buildDeveloperProjection } from '@/lib/share';

type RouteParams = {
  params: Promise<{ handoffId: string }>;
};

/**
 * The authenticated equivalent of app/api/share/[token]/export/route.ts —
 * same buildMarkdownExport builder, same content, but ownership-checked
 * instead of token-checked, so the designer can download their own handoff
 * without first creating a real, live share link (same reasoning as the
 * /preview page — see that route's history).
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { handoffId } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } },
      { status: 401 },
    );
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Handoff not found.' } }, { status: 404 });
  }

  const projection = await buildDeveloperProjection(handoffId);
  const markdown = buildMarkdownExport(projection);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${projection.name.replace(/[^a-z0-9-_]+/gi, '-')}.md"`,
    },
  });
}
