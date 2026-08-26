import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { DecisionControls } from '@/components/review/DecisionControls';
import { ImplementedIndicator } from '@/components/ui/ImplementedIndicator';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ComponentStateName, ProvenanceType, ReviewStatus } from '@/lib/types';

export type ComponentStateItem = {
  id: string;
  name: ComponentStateName;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
};

type ComponentStateListProps = {
  states: ComponentStateItem[];
  /** Every state shares its parent Component's one pin — see lib/screenPins.ts. */
  pinScreenId?: string | null;
  pinKey?: `component:${string}`;
};

export function ComponentStateList({ states, pinScreenId, pinKey }: ComponentStateListProps) {
  if (states.length === 0) {
    return <p className="text-[--color-text-muted]">No states reported.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {states.map((state) => (
        <div key={state.id} className="flex flex-col gap-2 border-b border-[--color-border] py-3 last:border-b-0">
          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-[--color-text-body] sm:min-w-[8rem]">{state.name}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[--color-text-secondary]">{state.description}</span>
              <ProvenanceBadge provenance={state.provenance} />
              <ReviewStatusBadge status={state.reviewStatus} />
              {state.isImplemented && <ImplementedIndicator />}
              {pinScreenId && pinKey && <FindingPinLink screenId={pinScreenId} pinKey={pinKey} />}
            </div>
          </div>
          <DecisionControls
            findingType="ComponentState"
            findingReference={state.id}
            currentValue={state.description ?? ''}
            className="mt-4"
          />
        </div>
      ))}
    </div>
  );
}
