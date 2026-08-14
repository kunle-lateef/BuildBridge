import { DecisionControls } from '@/components/review/DecisionControls';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ComponentStateName, ProvenanceType, ReviewStatus } from '@/lib/types';

export type ComponentStateItem = {
  id: string;
  name: ComponentStateName;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
};

type ComponentStateListProps = {
  states: ComponentStateItem[];
};

export function ComponentStateList({ states }: ComponentStateListProps) {
  if (states.length === 0) {
    return <p className="text-[--color-text-muted]">No states reported.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {states.map((state) => (
        <div key={state.id} className="flex flex-col gap-1.5 border-b border-[--color-border] py-2 last:border-b-0">
          <div className="flex items-center gap-2">
            <span className="min-w-[8rem] text-[--color-text-body]">{state.name}</span>
            <span className="text-[--color-text-secondary]">{state.description}</span>
            <ProvenanceBadge provenance={state.provenance} />
            <ReviewStatusBadge status={state.reviewStatus} />
          </div>
          <DecisionControls
            findingType="ComponentState"
            findingReference={state.id}
            currentValue={state.description ?? ''}
          />
        </div>
      ))}
    </div>
  );
}
