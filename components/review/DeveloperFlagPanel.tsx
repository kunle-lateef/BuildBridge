'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { updateDeveloperFlagStatus } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { relativeTime } from '@/components/dashboard/NotificationList';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ChevronRight, Flag } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import type { DeveloperFlagKind, DeveloperFlagStatus } from '@/lib/types';

export type DeveloperFlagItem = {
  id: string;
  kind: DeveloperFlagKind;
  message: string;
  submittedByName: string | null;
  status: DeveloperFlagStatus;
  createdAt: string;
  /** What the flag is about, e.g. "Pay button · Hover"; null for the whole handoff. */
  target: string | null;
};

type DeveloperFlagPanelProps = {
  flags: DeveloperFlagItem[];
};

/**
 * Figma `04 — Handoff / Developer feedback tab`. Flags arrive from an
 * anonymous developer on the public share link, so each card says so
 * ("From a developer") and the text is shown as typed, never as a designer
 * decision (architecture.md: unverified, unauthenticated free text). Open
 * and acknowledged flags come first; resolved ones fold away.
 */
export function DeveloperFlagPanel({ flags }: DeveloperFlagPanelProps) {
  const [showResolved, setShowResolved] = useState(false);
  const active = flags.filter((flag) => flag.status !== 'Resolved');
  const resolved = flags.filter((flag) => flag.status === 'Resolved');

  return (
    <div className="flex max-w-[760px] flex-col gap-3">
      {active.map((flag) => (
        <FlagCard key={flag.id} flag={flag} />
      ))}
      {active.length === 0 && (
        <p className="m-0 rounded-[12px] border border-[--color-border] bg-white px-4 py-6 text-[14px] leading-5 text-[--color-text-secondary]">
          Nothing open. Every flag has been resolved.
        </p>
      )}

      {resolved.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={showResolved}
            onClick={() => setShowResolved((value) => !value)}
            className="flex items-center gap-2 self-start text-[14px] leading-5 text-[--color-text-body]"
          >
            <ChevronRight aria-hidden="true" size={14} className={cn('transition-transform', showResolved && 'rotate-90')} />
            {resolved.length} resolved
          </button>
          {showResolved && resolved.map((flag) => <FlagCard key={flag.id} flag={flag} />)}
        </div>
      )}

      <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
        Answering in Notes? Mark the flag resolved so the developer knows to look.
      </p>
    </div>
  );
}

const TRANSITION_MESSAGE: Record<DeveloperFlagStatus, string> = {
  Open: 'Reopened',
  Acknowledged: 'Marked as acknowledged',
  Resolved: 'Marked as resolved. The developer will see it.',
};

const STATUS_CHIP: Record<DeveloperFlagStatus, string> = {
  Open: 'bg-[--color-surface] text-[--color-text-body]',
  Acknowledged: 'bg-[--color-primary-light] text-[--color-primary]',
  Resolved: 'bg-[--color-surface] text-[--color-text-secondary]',
};

function FlagCard({ flag }: { flag: DeveloperFlagItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transition(status: DeveloperFlagStatus) {
    setIsPending(true);
    setError(null);
    const result = await updateDeveloperFlagStatus({ developerFlagId: flag.id, status });
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast(TRANSITION_MESSAGE[status]);
    router.refresh();
  }

  return (
    <article
      id={`flag-${flag.id}`}
      className={cn('flex scroll-mt-24 flex-col gap-3 rounded-[12px] border border-[--color-border] bg-white px-4 py-4', flag.status === 'Resolved' && 'opacity-75')}
    >
      <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[--color-surface] px-2 py-0.5 text-[--color-text-body]">
          <Flag aria-hidden="true" size={12} />
          {flag.kind}
        </span>
        <span className={cn('rounded-[4px] px-2 py-0.5', STATUS_CHIP[flag.status])}>{flag.status}</span>
        {flag.target && <span className="text-[--color-text-secondary]">{flag.target}</span>}
        <time dateTime={flag.createdAt} className="ml-auto text-[--color-text-secondary]">{relativeTime(flag.createdAt)}</time>
      </div>
      <p className="m-0 whitespace-pre-line text-[14px] leading-5 text-[--color-text-primary]">{flag.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">
          {flag.submittedByName ? `From ${flag.submittedByName}` : 'From a developer · no name given'}
        </span>
        <span className="flex-1" />
        {flag.status === 'Open' && (
          <Button variant="secondary" disabled={isPending} onClick={() => void transition('Acknowledged')}>
            Acknowledge
          </Button>
        )}
        {flag.status !== 'Resolved' ? (
          <Button variant="secondary" disabled={isPending} onClick={() => void transition('Resolved')}>
            Mark resolved
          </Button>
        ) : (
          <Button variant="ghost" disabled={isPending} onClick={() => void transition('Open')}>
            Reopen
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="m-0 flex items-center gap-2 text-[14px] text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </article>
  );
}
