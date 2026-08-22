'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ReadinessScoreDisplay } from '@/components/review/ReadinessScoreDisplay';
import { Card } from '@/components/ui/Card';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';

type WorkflowStep = { title: string; description: string };

type HowItWorksInteractiveProps = {
  steps: WorkflowStep[];
};

// Steps 0-2 (Upload/Analyze/Detect gaps) illustrate a component mid-review;
// steps 3-5 (Review/Resolve/Handoff) illustrate one already confirmed —
// matches the two example cards' own existing before/after story, so the
// scroll link just makes an already-true pairing visible.
const CARD_SPLIT_INDEX = 3;

/**
 * Ties the numbered step list to the sticky "Example handoff" cards beside
 * it: whichever step is scrolled to the vertical center becomes the active
 * one, and the card matching its phase (mid-review vs. confirmed) comes
 * forward while the other recedes. Both columns live in one client
 * component (rather than steps-only) because the active card is derived
 * from step-scroll state that has to reach a DOM position IntersectionObserver
 * alone can't span on its own. Same "small client wrapper around otherwise
 * static content" shape as HeroIntro.
 */
export function HowItWorksInteractive({ steps }: HowItWorksInteractiveProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = stepRefs.current.findIndex((el) => el === entry.target);
          if (index !== -1) setActiveIndex(index);
        });
      },
      // A thin horizontal band near vertical center, not the whole
      // viewport — the step nearest that band becomes active, same
      // technique most scroll-linked step lists use.
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    const currentRefs = stepRefs.current;
    currentRefs.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [steps.length]);

  const activeCard = activeIndex < CARD_SPLIT_INDEX ? 1 : 2;

  return (
    <>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
            How it works
          </span>
          <h2 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
            From upload to handoff
          </h2>
        </div>
        <ol className="relative flex max-w-2xl flex-col gap-10">
          <div aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px bg-[--color-primary-light]" />
          {steps.map((step, index) => {
            const isActive = index === activeIndex;

            return (
              <li
                key={step.title}
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}
                className="relative flex gap-6"
              >
                <span
                  className={cn(
                    'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono font-medium transition-all duration-300',
                    isActive
                      ? 'scale-105 bg-[--color-primary] text-white shadow-[0_0_0_6px_var(--color-primary-light)]'
                      : 'border border-[--color-border] bg-[--color-surface] text-[--color-text-muted]',
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1 pt-2">
                  <span
                    className={cn(
                      'text-[length:var(--font-desktop-heading-4-medium-size)] font-semibold transition-colors duration-300',
                      isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-muted]',
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      'text-[--color-text-secondary] transition-opacity duration-300',
                      isActive ? 'opacity-100' : 'opacity-60',
                    )}
                  >
                    {step.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
              Example handoff
            </span>
            <span className="font-semibold text-[--color-text-primary]">Checkout Redesign</span>
          </div>

          <div className="flex flex-col">
            <Card
              className={cn(
                'flex flex-col gap-4 transition-all duration-[400ms]',
                activeCard === 1
                  ? 'scale-100 opacity-100 saturate-100 shadow-[0_12px_30px_-16px_rgba(79,70,229,0.35)]'
                  : 'scale-[0.985] opacity-45 saturate-[0.7]',
              )}
            >
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-8 w-14 shrink-0 rounded-[--radius-md] bg-[--color-primary]" />
                <span className="font-medium text-[--color-text-primary]">Primary Button</span>
                <ProvenanceBadge provenance="Detected" className="ml-auto" />
              </div>

              <div className="flex items-center justify-between border-t border-[--color-border] pt-4">
                <span className="text-[--color-text-secondary]">Hover state</span>
                <ProvenanceBadge provenance="Inferred" />
              </div>

              <div className="flex items-center justify-between border-t border-[--color-border] pt-4">
                <span className="text-[--color-text-secondary]">Missing tablet breakpoint</span>
                <SeverityBadge severity="Medium" />
              </div>

              <div className="border-t border-[--color-border] pt-4">
                <ReadinessScoreDisplay
                  score={82}
                  hasUnresolvedCritical={false}
                  unresolvedCriticalCount={0}
                  algorithmVersion={1}
                />
              </div>
            </Card>

            <div aria-hidden="true" className="ml-6 h-4 w-px bg-[--color-primary-light]" />

            <Card
              className={cn(
                'flex flex-col gap-4 transition-all duration-[400ms]',
                activeCard === 2
                  ? 'scale-100 opacity-100 saturate-100 shadow-[0_12px_30px_-16px_rgba(79,70,229,0.35)]'
                  : 'scale-[0.985] opacity-45 saturate-[0.7]',
              )}
            >
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-8 w-3 shrink-0 rounded-[--radius-md] bg-[--color-primary]" />
                <span className="font-medium text-[--color-text-primary]">Sidebar</span>
                <ProvenanceBadge provenance="Suggested" className="ml-auto" />
              </div>

              <div className="flex items-center justify-between border-t border-[--color-border] pt-4">
                <span className="text-[--color-text-secondary]">No tablet breakpoint shown</span>
                <SeverityBadge severity="Critical" />
              </div>

              <div className="border-t border-[--color-border] pt-4">
                <div className="flex items-center gap-2 rounded-[--radius-md] bg-[--color-success-light] px-3 py-2 text-[--color-success]">
                  <CheckCircle2 aria-hidden="true" size={16} />
                  <span className="font-medium">Designer reviewed — Confirmed</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
