import { NextResponse } from 'next/server';

import { buildMarkdownExport } from '@/lib/export/markdown';
import { buildDeveloperProjection, resolveShareLink } from '@/lib/share';
import { shareTokenSchema } from '@/lib/validators/share';

type RouteParams = {
  params: Promise<{ token: string }>;
};

/**
 * A second read-only public entry point onto the same data as
 * app/api/share/[token]/route.ts — same fail-closed token check, same rate
 * limit tier (middleware.ts's /api/share/:path* matcher already covers this
 * path), just a Markdown rendering instead of JSON. A real download, not a
 * mutation, so it stays consistent with security.md's "no public write
 * path" — see buildMarkdownExport (lib/export/markdown.ts) for why the
 * content can never drift from what the share page itself shows.
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
  const markdown = buildMarkdownExport(projection);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${projection.name.replace(/[^a-z0-9-_]+/gi, '-')}.md"`,
    },
  });
}
