import { ComponentInstanceCard } from '@/components/handoff/ComponentInstanceCard';
import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { ImplementationMarkButton } from '@/components/handoff/ImplementationMarkButton';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

type ComponentsSectionProps = {
  shareToken?: string;
  components: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
    isImplemented: boolean;
    /** Optional so the designer review page's own Components rendering (which uses ComponentReviewCard, not this) isn't forced through this type. */
    pinScreenId?: string | null;
  }[];
};

export function ComponentsSection({ shareToken, components }: ComponentsSectionProps) {
  if (components.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Components
      </h2>
      <div className="flex flex-col gap-3">
        {components.map((component) => (
          <div key={component.id} className="flex flex-col gap-2 rounded-[--radius-lg] border border-[--color-border] p-4">
            <ComponentInstanceCard
              name={component.name}
              type={component.type}
              description={component.description}
              provenance={component.provenance}
              reviewStatus={component.reviewStatus}
              actions={
                component.pinScreenId && (
                  <FindingPinLink screenId={component.pinScreenId} pinKey={`component:${component.id}`} />
                )
              }
            />
            <ImplementationMarkButton
              shareToken={shareToken}
              findingType="Component"
              findingReference={component.id}
              initialImplemented={component.isImplemented}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
