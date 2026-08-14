import { DecisionControls } from '@/components/review/DecisionControls';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ProvenanceType, ReviewStatus, ViewportCategory } from '@/lib/types';

export type ResponsiveRuleItem = {
  id: string;
  viewportCategory: ViewportCategory;
  behavior: string;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
};

type ResponsiveRuleListProps = {
  rules: ResponsiveRuleItem[];
};

export function ResponsiveRuleList({ rules }: ResponsiveRuleListProps) {
  if (rules.length === 0) {
    return (
      <p className="text-[--color-text-muted]">
        No responsive evidence reported for this screen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rules.map((rule) => (
        <div key={rule.id} className="flex flex-col gap-1.5 border-b border-[--color-border] py-2 last:border-b-0">
          <div className="flex items-center gap-2">
            <span className="min-w-[6rem] text-[--color-text-body]">{rule.viewportCategory}</span>
            <span className="text-[--color-text-secondary]">{rule.behavior}</span>
            <ProvenanceBadge provenance={rule.provenance} />
            <ReviewStatusBadge status={rule.reviewStatus} />
          </div>
          <DecisionControls
            findingType="ResponsiveRule"
            findingReference={rule.id}
            currentValue={rule.behavior}
          />
        </div>
      ))}
    </div>
  );
}
