import Link from 'next/link';
import type { ReactNode } from 'react';

import { AuthBackground } from '@/components/marketing/AuthBackground';
import { BrandMark } from '@/components/ui/BrandMark';

type AuthLayoutProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * The standalone shell every auth page (sign-in, sign-up, forgot/reset
 * password) uses — no MarketingHeader/MarketingFooter, per the developer's
 * reference image. The logo still links home, since that's the one piece
 * of navigation worth keeping without the full header.
 */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackground />
      <div className="relative w-full max-w-lg border border-[--color-border] bg-[--color-background] px-5 py-12 sm:px-12">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          {/* The lockup's own SVG has ~15% of its width as trailing empty
              space to the right of the wordmark (measured via getBBox: the
              icon+text content spans 0–459 of the 650-wide viewBox, not the
              full box) — centering the box via flexbox therefore centers
              that empty margin along with it, leaving the actual visible
              icon+wordmark sitting left of true center. Nudging right by
              the same 14.69% corrects for it without touching the shared
              asset or BrandMark's other, non-centered usages (Sidebar,
              MarketingHeader/Footer). */}
          <BrandMark alt="BuildBridge" size={28} className="translate-x-[14.69%]" />
        </Link>

        <div className="flex flex-col items-center gap-1 pb-8 text-center">
          <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
            {title}
          </h1>
          {description && <p className="text-[--color-text-secondary]">{description}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
