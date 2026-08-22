import { AlertOctagon, MessageSquareWarning } from 'lucide-react';
import Link from 'next/link';

import { ArchiveHandoffButton } from '@/components/handoff/ArchiveHandoffButton';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { formatRelativeTime } from '@/lib/relativeTime';
import { scoreColorClass } from '@/lib/scoreColor';
import type { HandoffStatus } from '@/lib/types';

type HandoffListItemProps = {
  id: string;
  name: string;
  status: HandoffStatus;
  readinessScore: number | null;
  updatedAt: string;
  /** Open (Open/InReview) issues of any severity — surfaced inline so scanning the list doesn't require opening each handoff. */
  openIssueCount: number;
  openFlagCount: number;
};

export function HandoffListItem({
  id,
  name,
  status,
  readinessScore,
  updatedAt,
  openIssueCount,
  openFlagCount,
}: HandoffListItemProps) {
  return (
    <div className="group flex flex-col gap-3 rounded-[--radius-md] border border-[--color-border] px-4 py-3 transition-colors hover:border-[--color-primary] hover:bg-[--color-surface] sm:flex-row sm:items-center">
      <Link
        href={`/handoffs/${id}`}
        className="flex flex-1 items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-[--color-text-body] group-hover:text-[--color-primary-dark]">{name}</span>
          <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            Updated {formatRelativeTime(updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {openIssueCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[--color-error]"
              aria-label={`${openIssueCount} open issue${openIssueCount === 1 ? '' : 's'}`}
            >
              <AlertOctagon aria-hidden="true" size={14} />
              {openIssueCount}
            </span>
          )}
          {openFlagCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[--color-text-secondary]"
              aria-label={`${openFlagCount} open developer flag${openFlagCount === 1 ? '' : 's'}`}
            >
              <MessageSquareWarning aria-hidden="true" size={14} />
              {openFlagCount}
            </span>
          )}
          {readinessScore !== null && (
            <span className={`font-mono ${scoreColorClass(readinessScore)}`}>{readinessScore}%</span>
          )}
          <HandoffStatusBadge status={status} />
        </div>
      </Link>
      <ArchiveHandoffButton
        handoffId={id}
        isArchived={status === 'Archived'}
        className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      />
    </div>
  );
}
