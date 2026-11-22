import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/Button';
import { SystemPage } from '@/components/ui/SystemPage';

export const metadata: Metadata = {
  title: 'Not found — BuildBridge',
};

/**
 * Global 404 — also what notFound() renders throughout the app (e.g. an
 * unowned handoff or an invalid share token). Deliberately the same
 * message regardless of cause, matching the "doesn't exist or isn't yours"
 * non-enumeration pattern used everywhere ownership is checked — see
 * security.md's Unauthorized Resource Access guidance.
 */
export default function NotFound() {
  return (
    <SystemPage
      eyebrow="404"
      title="Page not found"
      body="This page doesn’t exist, or you don’t have access to it."
      actions={
        <>
          <Link href="/handoffs" className={buttonVariants({ variant: 'primary' })}>Go to your handoffs</Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary' })}>Home</Link>
        </>
      }
    />
  );
}
