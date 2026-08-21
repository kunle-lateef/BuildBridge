'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { ComponentReviewCard, type SpecificationItem } from '@/components/review/ComponentReviewCard';
import type { ComponentStateItem } from '@/components/review/ComponentStateList';
import { cn } from '@/lib/cn';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

type ComponentListItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  implemented: boolean;
  specifications: SpecificationItem[];
  states: ComponentStateItem[];
  pinScreenId: string | null;
};

type ComponentsListProps = {
  components: ComponentListItem[];
};

/**
 * Owns the All/Unreviewed toggle for the Components section — client-side
 * only, since every component's full data (including nested specs/states)
 * is already on the page; filtering it is never worth a round trip.
 *
 * Filters at the finding level, not just the component level: a component
 * stays visible as long as anything about it — itself, one of its specs,
 * one of its states — is still Unreviewed, and within a visible component
 * the already-decided specs/states are the ones actually filtered out.
 * A coarser "hide the whole component once it itself is decided" version
 * was tried first and rejected — it left every already-confirmed spec/state
 * inside a still-open component fully visible, which is the exact case
 * that makes a component-heavy handoff feel dense in the first place.
 */
export function ComponentsList({ components }: ComponentsListProps) {
  const [filter, setFilter] = useState<'all' | 'unreviewed'>('all');

  const visibleComponents = components
    .map((component) => {
      const hasUnreviewedSomewhere =
        component.reviewStatus === 'Unreviewed' ||
        component.specifications.some((spec) => spec.reviewStatus === 'Unreviewed') ||
        component.states.some((state) => state.reviewStatus === 'Unreviewed');

      if (filter === 'all') {
        return { component, showDecisionControls: true, hide: false };
      }

      return {
        component: {
          ...component,
          specifications: component.specifications.filter((spec) => spec.reviewStatus === 'Unreviewed'),
          states: component.states.filter((state) => state.reviewStatus === 'Unreviewed'),
        },
        showDecisionControls: component.reviewStatus === 'Unreviewed',
        hide: !hasUnreviewedSomewhere,
      };
    })
    .filter((entry) => !entry.hide);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Filter components"
        className="inline-flex w-fit items-center gap-1 rounded-[--radius-md] border border-[--color-border] p-1"
      >
        {(
          [
            { value: 'all' as const, label: 'All' },
            { value: 'unreviewed' as const, label: 'Unreviewed' },
          ]
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              'rounded-[--radius-sm] px-3 py-1 text-[--color-text-secondary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
              filter === option.value && 'bg-[--color-surface] text-[--color-text-primary]',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleComponents.length === 0 ? (
        <div className="flex items-center gap-2 rounded-[--radius-md] border border-[--color-border] p-3 text-[--color-text-secondary]">
          <CheckCircle2 aria-hidden="true" size={16} className="text-[--color-success]" />
          Nothing left to review — every component, specification, and state is decided.
        </div>
      ) : (
        visibleComponents.map(({ component, showDecisionControls }) => (
          <ComponentReviewCard
            key={component.id}
            id={component.id}
            name={component.name}
            type={component.type}
            description={component.description}
            provenance={component.provenance}
            reviewStatus={component.reviewStatus}
            implemented={component.implemented}
            specifications={component.specifications}
            states={component.states}
            pinScreenId={component.pinScreenId}
            showDecisionControls={showDecisionControls}
            hideEmptyStates={filter === 'unreviewed'}
          />
        ))
      )}
    </div>
  );
}
