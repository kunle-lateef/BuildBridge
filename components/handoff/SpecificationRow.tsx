import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { DecisionControls } from '@/components/review/DecisionControls';
import { ImplementedIndicator } from '@/components/ui/ImplementedIndicator';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

type SpecificationRowProps = {
  id: string;
  property: string;
  value: string;
  unit?: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  implemented: boolean;
  /** Points at the parent Component's pin — a spec never has its own region, see lib/screenPins.ts. */
  pinScreenId?: string | null;
  pinKey?: `component:${string}`;
};

/**
 * Property inspection as document-native content, not a floating panel —
 * see .agents/rules/reference-inspiration.md's Figma Dev Mode section.
 * Provenance is always visible inline, never a hover-reveal.
 */
export function SpecificationRow({
  id,
  property,
  value,
  unit,
  provenance,
  reviewStatus,
  implemented,
  pinScreenId,
  pinKey,
}: SpecificationRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-[--color-border] py-3 last:border-b-0">
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="text-[--color-text-body] sm:min-w-[10rem]">{property}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[--color-text-body]">
            {value}
            {unit ? ` ${unit}` : ''}
          </span>
          <ProvenanceBadge provenance={provenance} />
          <ReviewStatusBadge status={reviewStatus} />
          {implemented && <ImplementedIndicator />}
          {pinScreenId && pinKey && <FindingPinLink screenId={pinScreenId} pinKey={pinKey} />}
        </div>
      </div>
      <DecisionControls findingType="Specification" findingReference={id} currentValue={value} className="mt-4" />
    </div>
  );
}
