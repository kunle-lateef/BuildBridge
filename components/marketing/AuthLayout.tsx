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
      <div className="relative w-full max-w-md border border-[--color-border] bg-[--color-background] px-8 py-10 sm:px-10">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          <BrandMark alt="BuildBridge" size={28} />
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
