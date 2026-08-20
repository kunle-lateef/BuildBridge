/**
 * Verifies the Origin (or Referer, as fallback) header matches the host the
 * request itself was sent to — see security.md's CSRF section: "Route
 * handlers that perform state-changing operations must verify the origin of
 * the request against the app's domain." Server actions get this protection
 * built in automatically by Next.js; route handlers don't, so any route
 * handler that mutates state calls this explicitly.
 *
 * Deliberately compares against the request's own `Host` header rather than
 * the single fixed NEXT_PUBLIC_APP_URL — this is the standard Origin-vs-Host
 * CSRF check (OWASP), and it's what makes the check work no matter which
 * valid alias reaches this same server (localhost, 127.0.0.1, a LAN IP in
 * dev, etc.), where a fixed config value would reject legitimate same-server
 * requests that simply arrived via a different hostname. A cross-site
 * attacker's Origin still can never match this server's own Host, so this
 * stays just as safe against real CSRF.
 */
export function verifyOrigin(request: Request): boolean {
  const originHeader = request.headers.get('origin') ?? request.headers.get('referer');
  const hostHeader = request.headers.get('host');

  if (!originHeader || !hostHeader) {
    return false;
  }

  try {
    const requestHost = new URL(originHeader).host;
    return requestHost === hostHeader;
  } catch {
    return false;
  }
}
