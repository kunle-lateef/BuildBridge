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
  isImplemented: boolean;
};

type ComponentReviewCardProps = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
  specifications: SpecificationItem[];
  states: ComponentStateItem[];
  /** The screen to open when "show on screen" is clicked — null/undefined when this component has no derivable pin. */
  pinScreenId?: string | null;
  /** False when the Unreviewed filter has already decided this component — its own row still shows for context, just without a redundant already-answered decision. */
  showDecisionControls?: boolean;
  /** True when the Unreviewed filter emptied the states list by filtering, not because the component genuinely has none — "No states reported" would be misleading in that case. */
  hideEmptyStates?: boolean;
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
  isImplemented,
  specifications,
  states,
  pinScreenId,
  showDecisionControls = true,
  hideEmptyStates = false,
}: ComponentReviewCardProps) {
  const pinKey = `component:${id}` as const;

  return (
    <Card className="flex flex-col gap-4">
      <ComponentInstanceCard
        name={name}
        type={type}
        description={description}
        provenance={provenance}
        reviewStatus={reviewStatus}
        actions={pinScreenId ? <FindingPinLink screenId={pinScreenId} pinKey={pinKey} /> : undefined}
      />
      {isImplemented && <ImplementedIndicator />}
      {showDecisionControls && (
        <DecisionControls
          findingType="Component"
          findingReference={id}
          currentValue={description ?? ''}
          className="mt-2"
        />
      )}

      {specifications.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[--color-text-secondary]">Specifications</h3>
          {specifications.map((spec) => (
            <SpecificationRow key={spec.id} {...spec} pinScreenId={pinScreenId} pinKey={pinKey} />
          ))}
        </div>
      )}

      {(states.length > 0 || !hideEmptyStates) && (
        <div className="flex flex-col gap-2 border-t border-[--color-border] pt-4">
          <h3 className="text-[--color-text-secondary]">States</h3>
          <ComponentStateList states={states} pinScreenId={pinScreenId} pinKey={pinKey} />
        </div>
      )}
    </Card>
  );
}
