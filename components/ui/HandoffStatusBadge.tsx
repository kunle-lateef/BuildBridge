import { cn } from '@/lib/cn';
import type { HandoffStatus } from '@/lib/types';

/**
 * design-system.md's Color semantics table doesn't cover HandoffStatus (only
 * ProvenanceType, IssueSeverity, ReviewStatus, and IssueStatus) — unlike the
 * Detected/Inferred gap in Phase P0b, this doesn't need a new token: every
 * value below reuses an existing pair by semantic fit, following the same
 * reuse pattern the design system already uses (e.g. Unreviewed/Open/
 * InReview sharing one pair). Flagged for the developer to confirm or
 * adjust — this mapping is inferred, not specified.
 */
const STYLES: Record<HandoffStatus, string> = {
  Draft: 'bg-[--color-surface] text-[--color-text-secondary]',
  Analyzing: 'bg-[--color-primary-light] text-[--color-primary-dark]',
  NeedsReview: 'bg-[--color-warning-light] text-[--color-warning]',
  Ready: 'bg-[--color-success-light] text-[--color-success]',
  Shared: 'bg-[--color-info-light] text-[--color-info]',
  Archived: 'bg-[--color-surface] text-[--color-text-dismissed]',
};

const LABEL: Record<HandoffStatus, string> = {
  Draft: 'Draft',
  Analyzing: 'Analyzing',
  NeedsReview: 'Needs review',
  Ready: 'Ready',
  Shared: 'Shared',
  Archived: 'Archived',
};

type HandoffStatusBadgeProps = {
  status: HandoffStatus;
  className?: string;
};

export function HandoffStatusBadge({ status, className }: HandoffStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[--radius-sm] px-2 py-0.5 text-[length:var(--font-desktop-caption-medium-size)] font-medium',
        STYLES[status],
        className,
      )}
      aria-label={`Status: ${LABEL[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
