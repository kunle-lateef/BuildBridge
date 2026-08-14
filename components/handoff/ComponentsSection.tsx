import { ComponentInstanceCard } from '@/components/handoff/ComponentInstanceCard';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

type ComponentsSectionProps = {
  components: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
  }[];
};

export function ComponentsSection({ components }: ComponentsSectionProps) {
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
          <ComponentInstanceCard
            key={component.id}
            name={component.name}
            type={component.type}
            description={component.description}
            provenance={component.provenance}
            reviewStatus={component.reviewStatus}
            className="rounded-[--radius-lg] border border-[--color-border] p-4"
          />
        ))}
      </div>
    </section>
  );
}
