import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

// Two unrelated concerns share this file because Next.js only supports one
// middleware entrypoint: (1) protects the (dashboard) route group, per
// architecture.md's Authentication section — route groups are stripped from
// the URL, so the matcher targets the actual paths, not the group's
// directory name; (2) rate-limits the public share-link boundary (both the
// page and its JSON API) per security.md's Rate Limiting section, since a
// share-link token is effectively a bearer credential worth protecting
// against brute-forcing.
export default auth(async (request) => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/share/') || pathname.startsWith('/api/share/')) {
    const limit = await rateLimit(`share-link-read:${clientIp(request)}`, 30, 60 * 1000);

    if (!limit.success) {
      return new NextResponse('Too many requests.', { status: 429 });
    }

    return NextResponse.next();
  }

  if (!request.auth) {
    const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

// Runs on the Node.js runtime rather than the Edge Runtime — lib/auth.ts
// pulls in bcryptjs and jose's compression path (via the Prisma adapter and
// JWT handling), neither of which are Edge-compatible, and lib/rate-limit.ts
// pulls in ioredis, same constraint. BuildBridge has no requirement for
// edge-distributed middleware, so opting out is the smaller change versus
// splitting either module into an edge-safe subset.
export const runtime = 'nodejs';

export const config = {
  matcher: ['/handoffs/:path*', '/settings/:path*', '/share/:path*', '/api/share/:path*'],
};
