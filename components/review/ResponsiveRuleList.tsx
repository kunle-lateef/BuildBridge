import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { DecisionControls } from '@/components/review/DecisionControls';
import { ImplementedIndicator } from '@/components/ui/ImplementedIndicator';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ProvenanceType, ReviewStatus, ViewportCategory } from '@/lib/types';

type ResponsiveRuleItem = {
  id: string;
  viewportCategory: ViewportCategory;
  behavior: string;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
  /** Both set only when this rule is anchored to a Component with a derivable pin — see lib/screenPins.ts. */
  pinScreenId?: string | null;
  pinKey?: `component:${string}`;
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
        <div key={rule.id} className="flex flex-col gap-2 border-b border-[--color-border] py-2 last:border-b-0">
          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-[--color-text-body] sm:min-w-[6rem]">{rule.viewportCategory}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[--color-text-secondary]">{rule.behavior}</span>
              <ProvenanceBadge provenance={rule.provenance} />
              <ReviewStatusBadge status={rule.reviewStatus} />
              {rule.isImplemented && <ImplementedIndicator />}
              {rule.pinScreenId && rule.pinKey && (
                <FindingPinLink screenId={rule.pinScreenId} pinKey={rule.pinKey} />
              )}
            </div>
          </div>
          <DecisionControls
            findingType="ResponsiveRule"
            findingReference={rule.id}
            currentValue={rule.behavior}
            className="mt-4"
          />
        </div>
      ))}
    </div>
  );
}
