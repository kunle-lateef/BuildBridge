import { Loader2 } from 'lucide-react';

/**
 * Shared `loading.tsx` fallback for dashboard routes — see the UX audit's
 * "no loading.tsx anywhere" finding. Every dashboard page is an async
 * Server Component fetching directly in the body with no Suspense
 * boundary, so navigating showed blank/stale content until the response
 * arrived. A sibling `loading.tsx` file is all App Router needs to wrap a
 * route in Suspense — this is the shared fallback content for all of them.
 */
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 aria-hidden="true" size={28} className="animate-spin text-[--color-text-muted] motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
