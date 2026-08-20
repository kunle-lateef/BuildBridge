'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { updateDeveloperFlagStatus } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import type { DeveloperFlagKind, DeveloperFlagStatus } from '@/lib/types';

export type DeveloperFlagItem = {
  id: string;
  kind: DeveloperFlagKind;
  message: string;
  submittedByName: string | null;
  status: DeveloperFlagStatus;
  createdAt: string;
  findingReference: string | null;
};

type DeveloperFlagPanelProps = {
  flags: DeveloperFlagItem[];
};

/**
 * Submitted by an anonymous developer through the public share link — not a
 * DesignerNote or DesignerDecision, so it's visually distinct from both
 * (an unfilled outline card, an explicit "From the share link" label) per
 * architecture.md's Data Flow note that this content is unverified,
 * unauthenticated free text. Open items sort first so a designer sees new
 * feedback without hunting for it.
 */
export function DeveloperFlagPanel({ flags }: DeveloperFlagPanelProps) {
  const open = flags.filter((flag) => flag.status !== 'Resolved');
  const resolved = flags.filter((flag) => flag.status === 'Resolved');

  if (flags.length === 0) {
    return <p className="text-[--color-text-muted]">No developer feedback yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {open.map((flag) => (
          <DeveloperFlagRow key={flag.id} flag={flag} />
        ))}
        {open.length === 0 && <p className="text-[--color-text-muted]">No open developer feedback.</p>}
      </div>

      {resolved.length > 0 && (
        <details className="rounded-[--radius-lg] border border-[--color-border] p-3">
          <summary className="cursor-pointer text-[--color-text-secondary]">
            {resolved.length} resolved
          </summary>
          <div className="mt-3 flex flex-col gap-3 opacity-70">
            {resolved.map((flag) => (
              <DeveloperFlagRow key={flag.id} flag={flag} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const TRANSITION_MESSAGE: Record<DeveloperFlagStatus, string> = {
  Open: 'Reopened.',
  Acknowledged: 'Marked as acknowledged.',
  Resolved: 'Marked as resolved.',
};

function DeveloperFlagRow({ flag }: { flag: DeveloperFlagItem }) {
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
    <Card id={`flag-${flag.id}`} className="flex flex-col gap-2 scroll-mt-20 border-dashed p-3">
      <div className="flex items-center gap-2">
        <span className="text-[length:var(--font-desktop-caption-medium-size)] font-medium text-[--color-text-secondary]">
          From the share link
        </span>
        <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
          {flag.kind}
        </span>
        <ReviewStatusBadge status={flag.status} />
        {flag.findingReference && (
          <a href={`#issue-${flag.findingReference}`} className="ml-auto text-[--color-primary] hover:underline">
            View finding
          </a>
        )}
      </div>
      <p className="text-[--color-text-body]">{flag.message}</p>
      <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
        {flag.submittedByName ? `— ${flag.submittedByName}, ` : '— Anonymous, '}
        {new Date(flag.createdAt).toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        {flag.status === 'Open' && (
          <Button variant="secondary" size="sm" disabled={isPending} onClick={() => void transition('Acknowledged')}>
            Acknowledge
          </Button>
        )}
        {flag.status !== 'Resolved' && (
          <Button variant="secondary" size="sm" disabled={isPending} onClick={() => void transition('Resolved')}>
            Mark resolved
          </Button>
        )}
        {flag.status === 'Resolved' && (
          <Button variant="ghost" size="sm" disabled={isPending} onClick={() => void transition('Open')}>
            Reopen
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </Card>
  );
}
