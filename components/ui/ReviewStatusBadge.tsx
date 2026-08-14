import { cn } from '@/lib/cn';
import type { IssueStatus, ReviewStatus } from '@/lib/types';

type StatusValue = ReviewStatus | IssueStatus;

const STYLES: Record<StatusValue, string> = {
  Unreviewed: 'bg-[--color-surface] text-[--color-text-secondary]',
  Confirmed: 'bg-[--color-success-light] text-[--color-success]',
  Modified: 'bg-[--color-primary-light] text-[--color-primary-dark]',
  Rejected: 'bg-[--color-surface] text-[--color-text-dismissed] line-through',
  Resolved: 'bg-[--color-success-light] text-[--color-success]',
  Open: 'bg-[--color-surface] text-[--color-text-secondary]',
  InReview: 'bg-[--color-surface] text-[--color-text-secondary]',
  Dismissed: 'bg-[--color-surface] text-[--color-text-dismissed] line-through',
};

type ReviewStatusBadgeProps = {
  status: StatusValue;
  className?: string;
};

/**
 * Shared for a finding's ReviewStatus (Unreviewed/Confirmed/Modified/
 * Rejected/Resolved) and a HandoffIssue's IssueStatus (Open/InReview/
 * Resolved/Dismissed) — the visual pattern is identical even though the
 * two enums are distinct and don't share every value. Pass the enum's
 * actual value straight through; never translate one enum's spelling to
 * the other's. See .agents/rules/design-system.md's Color semantics table.
 */
export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[--radius-sm] px-2 py-0.5 text-[length:var(--font-desktop-caption-medium-size)] font-medium',
        STYLES[status],
        className,
      )}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}
