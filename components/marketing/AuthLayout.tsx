import Link from 'next/link';
import type { ReactNode } from 'react';

import { ProofPanel, SharePanel } from '@/components/marketing/AuthPanels';
import { BrandMark } from '@/components/ui/BrandMark';
import { cn } from '@/lib/cn';

type AuthLayoutProps = {
  /** Shown as the card heading. Omit when the form renders its own (it changes after submit). */
  title?: string;
  description?: ReactNode;
  /** Figma `02 — Auth`: Sign in shows the shared-link panel, Sign up the designer/developer proof. */
  panel?: 'share' | 'proof';
  children: ReactNode;
};

/**
 * The shell every auth page uses, as in Figma `02 — Auth`: logo top left,
 * Terms · Privacy bottom left, the form in a bordered card, and on Sign in
 * and Sign up a 600px panel on the right (hidden on phones). No marketing
 * header or footer.
 */
export function AuthLayout({ title, description, panel, children }: AuthLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-white', panel && 'lg:grid lg:grid-cols-[minmax(0,1fr)_600px]')}>
      <div className="relative flex min-h-screen flex-col px-5 py-4 sm:px-10 sm:py-8">
        <Link href="/" className="self-start">
          <BrandMark alt="BuildBridge" size={28} />
        </Link>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-[464px] flex-col gap-5 rounded-[12px] border border-[--color-border] bg-white p-6 sm:p-8">
            {title && <AuthHeading title={title} description={description} />}
            {children}
          </div>
        </main>

        <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
          <Link href="/terms" className="hover:text-[--color-text-primary]">
            Terms
          </Link>
          {'  ·  '}
          <Link href="/privacy" className="hover:text-[--color-text-primary]">
            Privacy
          </Link>
        </p>
      </div>

      {panel === 'share' && <SharePanel />}
      {panel === 'proof' && <ProofPanel />}
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pb-2">
      <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">{title}</h1>
      {description && <p className="m-0 text-[16px] leading-6 text-[--color-text-secondary]">{description}</p>}
    </div>
  );
}

/** Figma's auth notice: tinted box, icon, a bold line and an optional detail line. */
export function AuthNotice({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  icon: ReactNode;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-[8px] px-3.5 py-3 text-[14px] leading-5',
        tone === 'error' && 'bg-[--color-error-light]',
        tone === 'success' && 'bg-[--color-success-light]',
        tone === 'info' && 'bg-[--color-info-light]',
      )}
    >
      <span
        className={cn(
          'pt-0.5',
          tone === 'error' && 'text-[--color-error]',
          tone === 'success' && 'text-[--color-text-body]',
          tone === 'info' && 'text-[--color-info]',
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        {title && (
          <span
            className={cn(
              'font-medium',
              tone === 'error' && 'text-[--color-error]',
              tone === 'success' && 'text-[--color-text-body]',
              tone === 'info' && 'text-[--color-text-primary]',
            )}
          >
            {title}
          </span>
        )}
        {children && <span className="text-[--color-text-body]">{children}</span>}
      </span>
    </div>
  );
}
