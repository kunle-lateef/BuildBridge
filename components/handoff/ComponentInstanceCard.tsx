import type { ReactNode } from 'react';

import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

type ComponentInstanceCardProps = {
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  /** e.g. a FindingPinLink — undefined by default, so existing callers are unaffected. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Read-only component summary — name/type/description plus its provenance
 * and review state. Reused wherever a component needs to be shown without
 * the full interactive review controls (ComponentReviewCard composes this
 * for the review screen's editable version).
 */
export function ComponentInstanceCard({
  name,
  type,
  description,
  provenance,
  reviewStatus,
  actions,
  className,
}: ComponentInstanceCardProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-[--color-text-primary]">{name}</span>
        <span className="text-[--color-text-muted]">{type}</span>
        <ProvenanceBadge provenance={provenance} />
        <ReviewStatusBadge status={reviewStatus} />
        {actions}
      </div>
      {description && <p className="text-[--color-text-secondary]">{description}</p>}
    </div>
  );
}
