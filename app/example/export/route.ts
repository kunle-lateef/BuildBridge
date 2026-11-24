import { NextResponse } from 'next/server';

import { buildExampleProjection } from '@/lib/example/projection';
import { buildMarkdownExport } from '@/lib/export/markdown';

/** "Download as Markdown" on the public /example page: the example fixture, no database. */
export function GET(): Response {
  return new NextResponse(buildMarkdownExport(buildExampleProjection()), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ledger-checkout-v3-example.md"',
    },
  });
}
