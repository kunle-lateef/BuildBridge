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
  isImplemented: boolean;
};

type StatesSectionProps = {
  shareToken?: string;
  components: { id: string; name: string; states: ComponentState[]; pinScreenId?: string | null }[];
};

// Content/lifecycle states, as opposed to InteractionsSection.tsx's
// user-triggered subset — see that file's comment for the full rationale
// behind this split.
const CONTENT_STATE_NAMES: ComponentStateName[] = ['Default', 'Empty', 'Error'];

export function StatesSection({ shareToken, components }: StatesSectionProps) {
  const rows = components
    .map((component) => ({
      ...component,
      states: component.states.filter((state) => CONTENT_STATE_NAMES.includes(state.name)),
    }))
    .filter((component) => component.states.length > 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        States
      </h2>
      {rows.map((component) => (
        <div key={component.id} className="flex flex-col gap-1.5">
          <h3 className="text-[--color-text-secondary]">{component.name}</h3>
          {component.states.map((state) => (
            <div key={state.id} className="flex flex-col gap-1 border-b border-[--color-border] py-2 last:border-b-0">
              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-[--color-text-body] sm:min-w-[8rem]">{state.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[--color-text-secondary]">{state.description}</span>
                  <ProvenanceBadge provenance={state.provenance} />
                  <ReviewStatusBadge status={state.reviewStatus} />
                  {component.pinScreenId && (
                    <FindingPinLink screenId={component.pinScreenId} pinKey={`component:${component.id}`} />
                  )}
                </div>
              </div>
              <ImplementationMarkButton
                shareToken={shareToken}
                findingType="ComponentState"
                findingReference={state.id}
                initialImplemented={state.isImplemented}
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
