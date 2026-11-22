'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button, buttonVariants } from '@/components/ui/Button';
import { SystemPage } from '@/components/ui/SystemPage';
import { logger } from '@/lib/logger';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Global client-side error boundary (Figma `11 — System / Error`). Never
 * shows the raw error message to the user — it may contain stack traces or
 * internal details — see architecture.md's Error Handling section. Logged
 * via lib/logger.ts rather than a bare console call.
 */
export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logger.error('client.unhandled_error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <SystemPage
      eyebrow="Error"
      title="Something went wrong on our side"
      body="Your work up to your last save is safe. Try again, and if it keeps happening, come back in a few minutes."
      actions={
        <>
          <Button type="button" onClick={() => reset()}>Try again</Button>
          <Link href="/handoffs" className={buttonVariants({ variant: 'secondary' })}>Go to your handoffs</Link>
        </>
      }
    />
  );
}
