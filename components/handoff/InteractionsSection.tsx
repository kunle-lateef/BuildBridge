import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { ImplementationMarkButton } from '@/components/handoff/ImplementationMarkButton';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ComponentStateName, ProvenanceType, ReviewStatus } from '@/lib/types';

type ComponentState = {
  id: string;
  name: ComponentStateName;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  implemented: boolean;
};

type InteractionsSectionProps = {
  shareToken?: string;
  components: { id: string; name: string; states: ComponentState[]; pinScreenId?: string | null }[];
};

/**
 * design-system.md's fixed section order lists both "Interactions" and
 * "States" as distinct sections, but both are backed by the same
 * ComponentState data (architecture.md's "state & interaction analysis"
 * stage) — there's no separate interaction/flow entity in the schema. This
 * is an interpretive split, not a specified one: Interactions covers the
 * user-triggered subset (Hover/Focus/Disabled/Loading); StatesSection.tsx
 * covers the content/lifecycle subset (Default/Empty/Error). Flagged for
 * the developer to confirm or repartition.
 */
const INTERACTION_STATE_NAMES: ComponentStateName[] = ['Hover', 'Focus', 'Disabled', 'Loading'];

export function InteractionsSection({ shareToken, components }: InteractionsSectionProps) {
  const rows = components
    .map((component) => ({
      ...component,
      states: component.states.filter((state) => INTERACTION_STATE_NAMES.includes(state.name)),
    }))
    .filter((component) => component.states.length > 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Interactions
      </h2>
      {rows.map((component) => (
        <div key={component.id} className="flex flex-col gap-1.5">
          <h3 className="text-[--color-text-secondary]">{component.name}</h3>
          {component.states.map((state) => (
            <div key={state.id} className="flex flex-col gap-1 border-b border-[--color-border] py-2 last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="min-w-[8rem] text-[--color-text-body]">{state.name}</span>
                <span className="text-[--color-text-secondary]">{state.description}</span>
                <ProvenanceBadge provenance={state.provenance} />
                <ReviewStatusBadge status={state.reviewStatus} />
                {component.pinScreenId && (
                  <FindingPinLink screenId={component.pinScreenId} pinKey={`component:${component.id}`} />
                )}
              </div>
              <ImplementationMarkButton
                shareToken={shareToken}
                findingType="ComponentState"
                findingReference={state.id}
                initialImplemented={state.implemented}
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
