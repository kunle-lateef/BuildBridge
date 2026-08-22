import { CheckCircle2, MessageSquareWarning } from 'lucide-react';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

export type AttentionItem =
  | { kind: 'CriticalIssue'; id: string; title: string; handoffId: string; handoffName: string; createdAt: string }
  | { kind: 'DeveloperFlag'; id: string; title: string; handoffId: string; handoffName: string; createdAt: string };

type AttentionQueueProps = {
  items: AttentionItem[];
};

/**
 * Every open Critical issue and open developer flag across all of the
 * user's handoffs, newest first — replaces having to open each handoff in
 * turn to discover either exists. Deep-links straight to the finding via
 * the same #issue-{id}/#flag-{id} anchors the review page already renders.
 */
export function AttentionQueue({ items }: AttentionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 text-[--color-text-secondary]">
        <CheckCircle2 aria-hidden="true" size={16} className="text-[--color-success]" />
        Nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {items.map((item) => (
        <Card
          key={`${item.kind}-${item.id}`}
          className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            {item.kind === 'CriticalIssue' ? (
              <SeverityBadge severity="Critical" />
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-[--radius-sm] bg-[--color-surface] px-2 py-0.5 text-[length:var(--font-desktop-caption-medium-size)] font-medium text-[--color-text-secondary]">
                <MessageSquareWarning aria-hidden="true" size={12} />
                Developer flag
              </span>
            )}
            <Link
              href={
                item.kind === 'CriticalIssue'
                  ? `/handoffs/${item.handoffId}#issue-${item.id}`
                  : `/handoffs/${item.handoffId}#flag-${item.id}`
              }
              className="min-w-0 flex-1 truncate text-[--color-text-body] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              {item.title}
            </Link>
          </div>
          <span className="shrink-0 text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            {item.handoffName}
          </span>
        </Card>
      ))}
    </div>
  );
}
