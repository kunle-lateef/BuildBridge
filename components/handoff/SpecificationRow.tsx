import { DecisionControls } from '@/components/review/DecisionControls';
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
};

/**
 * Property inspection as document-native content, not a floating panel —
 * see .agents/rules/reference-inspiration.md's Figma Dev Mode section.
 * Provenance is always visible inline, never a hover-reveal.
 */
export function SpecificationRow({ id, property, value, unit, provenance, reviewStatus }: SpecificationRowProps) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-[--color-border] py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="min-w-[10rem] text-[--color-text-body]">{property}</span>
        <span className="font-mono text-[--color-text-body]">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
        <ProvenanceBadge provenance={provenance} />
        <ReviewStatusBadge status={reviewStatus} />
      </div>
      <DecisionControls findingType="Specification" findingReference={id} currentValue={value} />
    </div>
  );
}
