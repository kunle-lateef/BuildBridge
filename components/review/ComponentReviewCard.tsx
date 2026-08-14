import { ComponentInstanceCard } from '@/components/handoff/ComponentInstanceCard';
import { SpecificationRow } from '@/components/handoff/SpecificationRow';
import { ComponentStateList, type ComponentStateItem } from '@/components/review/ComponentStateList';
import { DecisionControls } from '@/components/review/DecisionControls';
import type { ProvenanceType, ReviewStatus, SpecificationCategory } from '@/lib/types';

export type SpecificationItem = {
  id: string;
  category: SpecificationCategory;
  property: string;
  value: string;
  unit: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
};

type ComponentReviewCardProps = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  specifications: SpecificationItem[];
  states: ComponentStateItem[];
};

/**
 * The review screen's per-component unit: identity, designer authority over
 * the component itself, then its specifications and states — each with
 * their own provenance and their own DecisionControls, since a designer
 * confirms/modifies/rejects/overrides findings individually, not as a
 * bundle. See AGENTS.md's Non-Negotiable #2 (provenance never optional)
 * and #3 (a decision is never silently overwritten).
 */
export function ComponentReviewCard({
  id,
  name,
  type,
  description,
  provenance,
  reviewStatus,
  specifications,
  states,
}: ComponentReviewCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[--radius-lg] border border-[--color-border] p-4">
      <ComponentInstanceCard
        name={name}
        type={type}
        description={description}
        provenance={provenance}
        reviewStatus={reviewStatus}
      />
      <DecisionControls findingType="Component" findingReference={id} currentValue={description ?? ''} />

      {specifications.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-[--color-text-secondary]">Specifications</h3>
          {specifications.map((spec) => (
            <SpecificationRow key={spec.id} {...spec} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-[--color-text-secondary]">States</h3>
        <ComponentStateList states={states} />
      </div>
    </div>
  );
}
