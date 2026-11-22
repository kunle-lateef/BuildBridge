import { Check } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { DeveloperFlagStatus, IssueStatus, ReviewStatus } from '@/lib/types';

type StatusValue = ReviewStatus | IssueStatus | DeveloperFlagStatus;

const STYLES: Record<StatusValue, string> = {
  Unreviewed: 'bg-[--color-surface] text-[--color-text-secondary]',
  // Done states are ink text with a check, no fill: in the Blueprint
  // palette colour only means evidence or a problem (code-phase-plan.md).
  Confirmed: 'gap-1 px-0 text-[--color-success]',
  Modified: 'bg-[--color-primary-light] text-[--color-primary-dark]',
  Rejected: 'bg-[--color-surface] text-[--color-text-dismissed] line-through',
  Resolved: 'gap-1 px-0 text-[--color-success]',
  Open: 'bg-[--color-surface] text-[--color-text-secondary]',
  InReview: 'bg-[--color-surface] text-[--color-text-secondary]',
  Dismissed: 'bg-[--color-surface] text-[--color-text-dismissed] line-through',
  Acknowledged: 'bg-[--color-primary-light] text-[--color-primary-dark]',
};

const DONE_STATUSES = new Set<StatusValue>(['Confirmed', 'Resolved']);

type ReviewStatusBadgeProps = {
  status: StatusValue;
  className?: string;
};

/**
 * Shared for a finding's ReviewStatus (Unreviewed/Confirmed/Modified/
 * Rejected/Resolved), a HandoffIssue's IssueStatus (Open/InReview/
 * Resolved/Dismissed), and a DeveloperFlag's DeveloperFlagStatus
 * (Open/Acknowledged/Resolved) — the visual pattern is identical even
 * though the enums are distinct and don't share every value. Pass the
 * enum's actual value straight through; never translate one enum's
 * spelling to another's. See .agents/rules/design-system.md's Color
 * semantics table.
 */
export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[--radius-sm] px-2 text-[12px] font-medium leading-4',
        STYLES[status],
        className,
      )}
      aria-label={`Status: ${status}`}
    >
      {DONE_STATUSES.has(status) ? (
        <Check aria-hidden="true" size={14} />
      ) : (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}
