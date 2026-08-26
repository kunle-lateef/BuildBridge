import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { ImplementationMarkButton } from '@/components/handoff/ImplementationMarkButton';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ProvenanceType, ReviewStatus, SpecificationCategory } from '@/lib/types';

type Specification = {
  id: string;
  category: SpecificationCategory;
  property: string;
  value: string;
  unit: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
};

type SpecificationsSectionProps = {
  shareToken?: string;
  components: { id: string; name: string; specifications: Specification[]; pinScreenId?: string | null }[];
};

/**
 * Property inspection as document-native content, not a floating panel —
 * see .agents/rules/reference-inspiration.md's Figma Dev Mode section.
 * Read-only otherwise: no DecisionControls on the public developer view,
 * ImplementationMarkButton is the one interactive exception.
 */
export function SpecificationsSection({ shareToken, components }: SpecificationsSectionProps) {
  const withSpecs = components.filter((component) => component.specifications.length > 0);

  if (withSpecs.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Specifications
      </h2>
      {withSpecs.map((component) => (
        <div key={component.id} className="flex flex-col gap-1.5">
          <h3 className="text-[--color-text-secondary]">{component.name}</h3>
          {component.specifications.map((spec) => (
            <div key={spec.id} className="flex flex-col gap-1 border-b border-[--color-border] py-2 last:border-b-0">
              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[--color-text-body] sm:min-w-[10rem]">{spec.property}</span>
                  <span className="font-mono text-[--color-text-body]">
                    {spec.value}
                    {spec.unit ? ` ${spec.unit}` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ProvenanceBadge provenance={spec.provenance} />
                  <ReviewStatusBadge status={spec.reviewStatus} />
                  {component.pinScreenId && (
                    <FindingPinLink screenId={component.pinScreenId} pinKey={`component:${component.id}`} />
                  )}
                </div>
              </div>
              <ImplementationMarkButton
                shareToken={shareToken}
                findingType="Specification"
                findingReference={spec.id}
                initialImplemented={spec.isImplemented}
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
