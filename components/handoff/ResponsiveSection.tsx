import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { ImplementationMarkButton } from '@/components/handoff/ImplementationMarkButton';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ProvenanceType, ReviewStatus, ViewportCategory } from '@/lib/types';

type ResponsiveSectionProps = {
  shareToken?: string;
  rules: {
    id: string;
    componentId?: string | null;
    screenName: string | null;
    viewportCategory: ViewportCategory;
    behavior: string;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
    isImplemented: boolean;
    pinScreenId?: string | null;
  }[];
};

export function ResponsiveSection({ shareToken, rules }: ResponsiveSectionProps) {
  if (rules.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Responsive behavior
      </h2>
      <div className="flex flex-col gap-1.5">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-col gap-1 border-b border-[--color-border] py-2 last:border-b-0">
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[--color-text-body] sm:min-w-[6rem]">{rule.viewportCategory}</span>
                {rule.screenName && <span className="text-[--color-text-muted]">{rule.screenName}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[--color-text-secondary]">{rule.behavior}</span>
                <ProvenanceBadge provenance={rule.provenance} />
                <ReviewStatusBadge status={rule.reviewStatus} />
                {rule.componentId && rule.pinScreenId && (
                  <FindingPinLink screenId={rule.pinScreenId} pinKey={`component:${rule.componentId}`} />
                )}
              </div>
            </div>
            <ImplementationMarkButton
              shareToken={shareToken}
              findingType="ResponsiveRule"
              findingReference={rule.id}
              initialImplemented={rule.isImplemented}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
