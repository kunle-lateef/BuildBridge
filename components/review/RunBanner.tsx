import type { ReactNode } from 'react';

import { AlertCircle, XCircle } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * The banner under the Review header when an analysis didn't fully finish
 * (Figma `04 — Handoff` → "Review — Partly analyzed" / "— Analysis
 * failed"): what happened, in two lines, and the one action that helps.
 */
export function RunBanner({
  tone,
  title,
  action,
  children,
}: {
  tone: 'neutral' | 'error';
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-3 rounded-[8px] px-4 py-3 sm:flex-row sm:items-center',
        tone === 'error' ? 'bg-[--color-error-light]' : 'bg-[--color-surface]',
      )}
    >
      {tone === 'error' ? (
        <XCircle aria-hidden="true" size={16} className="shrink-0 text-[--color-error]" />
      ) : (
        <AlertCircle aria-hidden="true" size={16} className="shrink-0 text-[--color-text-secondary]" />
      )}
      <div className="flex min-w-0 flex-1 flex-col text-[14px] leading-5">
        <span className="font-medium text-[--color-text-primary]">{title}</span>
        <span className="text-[--color-text-body]">{children}</span>
      </div>
      {action}
    </div>
  );
}
