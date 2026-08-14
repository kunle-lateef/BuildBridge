import { env } from '@/lib/env';

/**
 * Verifies the Origin (or Referer, as fallback) header matches the app's
 * own domain — see security.md's CSRF section: "Route handlers that
 * perform state-changing operations must verify the origin of the request
 * against the app's domain." Server actions get this protection built in
 * automatically by Next.js; route handlers don't, so any route handler
 * that mutates state calls this explicitly.
 */
export function verifyOrigin(request: Request): boolean {
  const originHeader = request.headers.get('origin') ?? request.headers.get('referer');

  if (!originHeader) {
    return false;
  }

  try {
    const requestHost = new URL(originHeader).host;
    const appHost = new URL(env.NEXT_PUBLIC_APP_URL).host;
    return requestHost === appHost;
  } catch {
    return false;
  }
}
