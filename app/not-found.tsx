import type { Metadata } from 'next';
import Link from 'next/link';

import { BrandMark } from '@/components/ui/BrandMark';

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
      <Link href="/" className="mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]">
        <BrandMark alt="BuildBridge" size={24} />
      </Link>
      <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Page not found
      </h1>
      <p className="text-[--color-text-secondary]">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className="text-[--color-primary] underline">
        Go back home
      </Link>
    </main>
  );
}
