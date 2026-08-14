'use client';

import { useEffect } from 'react';

import { logger } from '@/lib/logger';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Global client-side error boundary. Never shows the raw error message to
 * the user — it may contain stack traces or internal details — see
 * architecture.md's Error Handling section. Logged via lib/logger.ts
 * rather than a bare console call, even though this runs in the browser.
 */
export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logger.error('client.unhandled_error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Something went wrong
      </h1>
      <p className="text-[--color-text-secondary]">An unexpected error occurred. Try again, or come back later.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-[--radius-md] bg-[--color-primary] px-4 py-2 font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
      >
        Try again
      </button>
    </main>
  );
}
