import { ComponentInstanceCard } from '@/components/handoff/ComponentInstanceCard';
import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { SpecificationRow } from '@/components/handoff/SpecificationRow';
import { ComponentStateList, type ComponentStateItem } from '@/components/review/ComponentStateList';
import { DecisionControls } from '@/components/review/DecisionControls';
import { Card } from '@/components/ui/Card';
import { ImplementedIndicator } from '@/components/ui/ImplementedIndicator';
import type { ProvenanceType, ReviewStatus, SpecificationCategory } from '@/lib/types';

export type SpecificationItem = {
  id: string;
  category: SpecificationCategory;
  property: string;
  value: string;
  unit: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  implemented: boolean;
};

type ComponentReviewCardProps = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  implemented: boolean;
  specifications: SpecificationItem[];
  states: ComponentStateItem[];
  /** The screen to open when "show on screen" is clicked — null/undefined when this component has no derivable pin. */
  pinScreenId?: string | null;
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
  implemented,
  specifications,
  states,
  pinScreenId,
}: ComponentReviewCardProps) {
  const pinKey = `component:${id}` as const;

  return (
    <Card className="flex flex-col gap-3">
      <ComponentInstanceCard
        name={name}
        type={type}
        description={description}
        provenance={provenance}
        reviewStatus={reviewStatus}
        actions={pinScreenId ? <FindingPinLink screenId={pinScreenId} pinKey={pinKey} /> : undefined}
      />
      {implemented && <ImplementedIndicator />}
      <DecisionControls findingType="Component" findingReference={id} currentValue={description ?? ''} />

      {specifications.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-[--color-text-secondary]">Specifications</h3>
          {specifications.map((spec) => (
            <SpecificationRow key={spec.id} {...spec} pinScreenId={pinScreenId} pinKey={pinKey} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-[--color-text-secondary]">States</h3>
        <ComponentStateList states={states} pinScreenId={pinScreenId} pinKey={pinKey} />
      </div>
    </Card>
  );
}
