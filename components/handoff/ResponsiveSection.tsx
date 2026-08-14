import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ProvenanceType, ReviewStatus, ViewportCategory } from '@/lib/types';

type ResponsiveSectionProps = {
  rules: {
    id: string;
    screenName: string | null;
    viewportCategory: ViewportCategory;
    behavior: string;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
  }[];
};

export function ResponsiveSection({ rules }: ResponsiveSectionProps) {
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
          <div key={rule.id} className="flex items-center gap-2 border-b border-[--color-border] py-2 last:border-b-0">
            <span className="min-w-[6rem] text-[--color-text-body]">{rule.viewportCategory}</span>
            {rule.screenName && <span className="text-[--color-text-muted]">{rule.screenName}</span>}
            <span className="text-[--color-text-secondary]">{rule.behavior}</span>
            <ProvenanceBadge provenance={rule.provenance} />
            <ReviewStatusBadge status={rule.reviewStatus} />
          </div>
        ))}
      </div>
    </section>
  );
}
