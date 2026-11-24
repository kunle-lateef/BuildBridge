'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { onOpenInPanel, onReviewFinding, type AskAbout } from '@/components/review/assistantEvents';
import { AssistantPanel } from '@/components/review/AssistantPanel';
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
  handoffId: string;
  handoffName: string;
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
export function FindingsPanel({ handoffId, handoffName, gaps, components, toReviewCount, reviewedCount, notice, reanalysis = null }: FindingsPanelProps) {
  const [view, setView] = useState<'toReview' | 'reviewed'>('toReview');
  const [showChanges, setShowChanges] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [hasOpenedAssistant, setHasOpenedAssistant] = useState(false);
  const [about, setAbout] = useState<AskAbout | null>(null);

  useEffect(
    () =>
      onOpenInPanel((next) => {
        setAbout(next);
        setHasOpenedAssistant(true);
        setIsAssistantOpen(true);
        setShowChanges(false);
      }),
    [],
  );

  // "Review this finding" / "Answer the gap": back to the findings, then to
  // that gap or component (opened). A responsive rule with no component
  // lives on the Responsive tab, so that one isn't claimed here.
  useEffect(
    () =>
      onReviewFinding((source) => {
        if (source.kind !== 'gap' && !source.componentId) return false;
        setIsAssistantOpen(false);
        setShowChanges(false);
        const targetId = source.kind === 'gap' ? `issue-${source.findingId}` : `component-${source.componentId}`;
        const reveal = (attempt: number) => {
          const target = document.getElementById(targetId);
          if (!target) {
            if (attempt === 0) setView((current) => (current === 'toReview' ? 'reviewed' : 'toReview'));
            if (attempt < 2) window.setTimeout(() => reveal(attempt + 1), 60);
            return;
          }
          target.scrollIntoView({ block: 'start', behavior: 'smooth' });
          const opener = target.querySelector<HTMLButtonElement>('[data-review-nav][aria-expanded="false"]');
          opener?.click();
          opener?.focus({ preventScroll: true });
        };
        window.setTimeout(() => reveal(0), 60);
        return true;
      }),
    [],
  );
  const criticalOpenCount = gaps.filter((gap) => gap.severity === 'Critical' && isOpenGap(gap)).length;

  const visibleGaps = gaps.filter((gap) => (view === 'toReview' ? isOpenGap(gap) : !isOpenGap(gap)));
  const visibleComponents = components.filter((component) =>
    view === 'toReview' ? hasUnreviewed(component) : hasReviewed(component),
  );

  // The assistant takes the panel's place (Figma `04 — Handoff /
  // Assistant`), full screen on phones. It stays mounted once opened, so
  // closing it and coming back keeps the conversation.
  const assistant = hasOpenedAssistant ? (
    <div
      className={cn(
        isAssistantOpen
          ? 'fixed inset-0 z-50 flex flex-col bg-white lg:static lg:z-auto lg:h-[calc(100vh-240px)] lg:min-h-[560px] lg:overflow-hidden lg:rounded-[12px] lg:border lg:border-[--color-border] xl:h-[calc(100vh-120px)]'
          : 'hidden',
      )}
    >
      <AssistantPanel
        handoffId={handoffId}
        handoffName={handoffName}
        about={about}
        onClearAbout={() => setAbout(null)}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  ) : null;

  // Same fragment shape in every branch, assistant first, so React keeps it.
  if (isAssistantOpen) return <>{assistant}</>;

  if (showChanges && reanalysis) {
    return (
      <>
        {assistant}
        <aside data-findings-panel className="flex min-w-0 flex-col overflow-y-auto rounded-[12px] border border-[--color-border] bg-white xl:max-h-[calc(100vh-120px)]">
          <ReanalysisChangesPanel summary={reanalysis} onBack={() => setShowChanges(false)} />
        </aside>
      </>
    );
  }

  return (
    <>
    {assistant}
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
    </>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="m-0 pl-1 pt-0.5 text-[12px] font-medium leading-4 tracking-[0.2px] text-[--color-text-secondary]">
      {children}
    </h3>
  );
}
