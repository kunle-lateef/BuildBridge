'use client';

import { useState, type ReactNode } from 'react';

import { ComponentReviewCard, type SpecificationItem } from '@/components/review/ComponentReviewCard';
import type { ComponentStateItem } from '@/components/review/ComponentStateList';
import { GapCard, isOpenGap, type PanelGap } from '@/components/review/GapCard';
import { ReanalysisChangesPanel, ReanalysisNotice, type ReanalysisSummary } from '@/components/review/ReanalysisChanges';
import { ShortcutHints } from '@/components/review/ReviewShortcuts';
import { CheckCircle2 } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

export type { PanelGap };

export type PanelComponent = {
  handoffId: string;
  id: string;
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
  specifications: SpecificationItem[];
  states: ComponentStateItem[];
  pinNumber: number | null;
};

type FindingsPanelProps = {
  gaps: PanelGap[];
  components: PanelComponent[];
  toReviewCount: number;
  reviewedCount: number;
  /** Shown above the lists, e.g. the analysis controls before the first run. */
  notice?: ReactNode;
  /** What the latest re-analysis changed, while something there still needs you. */
  reanalysis?: ReanalysisSummary | null;
};

const hasUnreviewed = (component: PanelComponent) =>
  component.reviewStatus === 'Unreviewed' ||
  component.specifications.some((spec) => spec.reviewStatus === 'Unreviewed') ||
  component.states.some((state) => state.reviewStatus === 'Unreviewed');

const hasReviewed = (component: PanelComponent) =>
  component.reviewStatus !== 'Unreviewed' ||
  component.specifications.some((spec) => spec.reviewStatus !== 'Unreviewed') ||
  component.states.some((state) => state.reviewStatus !== 'Unreviewed');

/**
 * The Review tab's Findings panel (Figma `04 — Handoff` → "Review — Desktop
 * 1440"): To review / Reviewed, then gaps as compact rows with what
 * answering each one does to readiness, then components.
 */
export function FindingsPanel({ gaps, components, toReviewCount, reviewedCount, notice, reanalysis = null }: FindingsPanelProps) {
  const [view, setView] = useState<'toReview' | 'reviewed'>('toReview');
  const [showChanges, setShowChanges] = useState(false);
  const criticalOpenCount = gaps.filter((gap) => gap.severity === 'Critical' && isOpenGap(gap)).length;

  const visibleGaps = gaps.filter((gap) => (view === 'toReview' ? isOpenGap(gap) : !isOpenGap(gap)));
  const visibleComponents = components.filter((component) =>
    view === 'toReview' ? hasUnreviewed(component) : hasReviewed(component),
  );

  if (showChanges && reanalysis) {
    return (
      <aside data-findings-panel className="flex min-w-0 flex-col overflow-y-auto rounded-[12px] border border-[--color-border] bg-white xl:max-h-[calc(100vh-120px)]">
        <ReanalysisChangesPanel summary={reanalysis} onBack={() => setShowChanges(false)} />
      </aside>
    );
  }

  return (
    <aside data-findings-panel className="flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[--color-border] bg-white xl:max-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between gap-3 border-b border-[--color-border] py-3 pl-4 pr-3">
        <h2 className="m-0 text-[14px] font-medium leading-5 text-[--color-text-primary]">Findings</h2>
        <div role="radiogroup" aria-label="Show findings" className="flex gap-0.5 rounded-[8px] bg-[--color-surface] p-0.5">
          {(
            [
              { value: 'toReview', label: 'To review', count: toReviewCount },
              { value: 'reviewed', label: 'Reviewed', count: reviewedCount },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={view === option.value}
              onClick={() => setView(option.value)}
              className={cn(
                'rounded-[4px] border px-3 py-1 text-[14px] font-medium leading-5 tracking-[0.1px]',
                view === option.value
                  ? 'border-[--color-border] bg-white text-[--color-text-primary]'
                  : 'border-transparent text-[--color-text-secondary]',
              )}
            >
              {option.label} {option.count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto px-3 pb-4 pt-3 [&>*]:shrink-0">
        {notice}
        {reanalysis && <ReanalysisNotice summary={reanalysis} onOpen={() => setShowChanges(true)} />}

        {visibleGaps.length > 0 && (
          <>
            <GroupLabel>Gaps · {visibleGaps.length}</GroupLabel>
            <div className="rounded-[8px] border border-[--color-border]">
              {visibleGaps.map((gap, index) => (
                <GapCard
                  key={gap.id}
                  gap={gap}
                  isLast={index === visibleGaps.length - 1}
                  impact={
                    !isOpenGap(gap)
                      ? null
                      : gap.severity === 'Critical' && criticalOpenCount === 1
                        ? 'Makes it ready'
                        : gap.delta > 0
                          ? `+${gap.delta}%`
                          : null
                  }
                />
              ))}
            </div>
          </>
        )}

        {visibleComponents.length > 0 && (
          <>
            <GroupLabel>Components · {visibleComponents.length}</GroupLabel>
            {visibleComponents.map((component, index) => (
              <ComponentReviewCard key={component.id} {...component} defaultOpen={index === 0 && view === 'toReview'} />
            ))}
          </>
        )}

        {visibleGaps.length === 0 && visibleComponents.length === 0 && !notice && (
          <p className="m-0 flex items-center gap-2 px-1 py-2 text-[14px] leading-5 text-[--color-text-secondary]">
            <CheckCircle2 aria-hidden="true" size={14} />
            {view === 'toReview' ? 'Nothing left to review.' : 'Nothing reviewed yet.'}
          </p>
        )}
      </div>
      <ShortcutHints />
    </aside>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="m-0 pl-1 pt-0.5 text-[12px] font-medium leading-4 tracking-[0.2px] text-[--color-text-secondary]">
      {children}
    </h3>
  );
}
