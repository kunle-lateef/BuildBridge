'use client';

import { Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  LOOP_FINDINGS,
  type LoopFinding,
  type LoopState,
} from '@/components/marketing/heroLoopTimeline';
import { buttonVariants } from '@/components/ui/Button';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';

type HeroLoopFindingsProps = {
  state: LoopState;
  reducedMotion: boolean;
};

const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SCORE_TWEEN_MS = 450;

/**
 * The review side of the loop: the findings list, the readiness ring, and the
 * share link. Below `sm` this is the whole loop (HeroHandoffLoop hides the
 * screen mockup there), so it stacks in normal flow; from `sm` up it is
 * pinned to the scaled stage's design coordinates.
 */
export function HeroLoopFindings({ state, reducedMotion }: HeroLoopFindingsProps) {
  const score = useCountUp(state.scoreTarget, reducedMotion);
  const isComplete = state.confirmedCount === LOOP_FINDINGS.length;
  const ringOffset = RING_CIRCUMFERENCE * (1 - score / 100);

  return (
    <>
      <div className="relative z-[3] w-full rounded-[--radius-xl] border border-[--color-border] bg-[--color-background] shadow-[0_30px_60px_-30px_rgba(30,41,59,0.35)] sm:absolute sm:left-[410px] sm:top-[90px] sm:w-[344px]">
        <div className="flex h-[72px] flex-col justify-center gap-0.5 border-b border-[--color-border] px-5">
          <span className="text-[length:var(--font-desktop-heading-4-semi-bold-size)] font-semibold text-[--color-text-primary]">
            Findings
          </span>
          <span className="font-mono text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            Checkout Redesign · v1
          </span>
        </div>

        <div className="relative h-[312px]">
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center text-[length:var(--font-desktop-label-regular-size)] text-[--color-text-muted] transition-opacity duration-200',
              state.isEmptyVisible ? 'opacity-100' : 'opacity-0',
            )}
          >
            Findings appear after analysis
          </div>
          {LOOP_FINDINGS.map((finding) => (
            <FindingRow key={finding.id} finding={finding} state={state} />
          ))}
        </div>

        <div className="flex h-[118px] items-center gap-[18px] px-5">
          <div className="relative h-[84px] w-[84px] shrink-0">
            <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
              <circle
                cx="42"
                cy="42"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--color-surface)"
                strokeWidth="8"
              />
              <circle
                cx="42"
                cy="42"
                r={RING_RADIUS}
                fill="none"
                stroke={isComplete ? 'var(--color-success)' : 'var(--color-primary)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 42 42)"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[length:var(--font-desktop-heading-4-semi-bold-size)] font-semibold tabular-nums text-[--color-text-primary]">
              {score}%
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-[length:var(--font-desktop-body-semi-bold-size)] font-semibold text-[--color-text-primary]">
              Readiness score
            </span>
            <span className="text-[length:var(--font-desktop-label-regular-size)] tabular-nums text-[--color-text-secondary]">
              {scoreCaption(state)}
            </span>
            <HandoffStatusBadge status={state.status} />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'relative z-[3] mt-4 flex w-full items-center gap-3.5 rounded-[--radius-xl] bg-[--color-text-primary] px-[18px] py-4 text-white transition-[opacity,transform] sm:absolute sm:left-[410px] sm:top-[616px] sm:mt-0 sm:w-[344px]',
          state.isShareVisible ? 'translate-y-0 opacity-100' : 'translate-y-3.5 opacity-0',
          state.isFadingOut ? 'duration-700' : 'duration-[400ms] ease-out',
        )}
      >
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[--radius-lg] bg-white/10 text-[--color-primary-light]">
          <Link2 aria-hidden="true" size={20} />
        </span>
        <div className="flex flex-col">
          <span className="text-[length:var(--font-desktop-body-semi-bold-size)] font-semibold">
            Read-only link ready
          </span>
          <span className="font-mono text-[length:var(--font-desktop-caption-regular-size)] text-[--color-primary-light]">
            Developers see confirmed specs only
          </span>
        </div>
      </div>
    </>
  );
}

function FindingRow({ finding, state }: { finding: LoopFinding; state: LoopState }) {
  const { isShown, isPressed, isDone, isRippling } = state.findings[finding.id];

  return (
    <div
      className={cn(
        'relative flex h-[78px] items-center justify-between gap-2.5 border-b border-[--color-surface] pl-5 pr-[18px] transition-[opacity,transform]',
        isShown ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
        state.isFadingOut ? 'duration-700' : 'delay-100 duration-[350ms] ease-out',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate text-[length:var(--font-desktop-body-medium-size)] font-medium text-[--color-text-primary]">
          {finding.name}
        </span>
        <div className="flex min-w-0 items-center gap-2">
          {'provenance' in finding.label ? (
            <ProvenanceBadge provenance={finding.label.provenance} className="shrink-0" />
          ) : (
            <SeverityBadge severity={finding.label.severity} className="shrink-0" />
          )}
          <span className="truncate font-mono text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-secondary]">
            {finding.value}
          </span>
        </div>
      </div>

      {/* Spans styled as buttons, never real <button>s — the loop is aria-hidden, and a focusable control inside it would be a keyboard trap (see HeroHandoffLoop). */}
      <div className="relative h-8 w-[90px] shrink-0">
        <span
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            'absolute inset-0 border-[--color-primary] bg-[--color-background] font-semibold text-[--color-primary] transition-[opacity,transform] duration-150',
            isPressed && 'scale-[0.93]',
            isDone && 'opacity-0',
          )}
        >
          {finding.action}
        </span>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
            isDone ? 'opacity-100' : 'opacity-0',
          )}
        >
          <ReviewStatusBadge status={finding.doneStatus} />
        </span>
        {isRippling && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 -ml-[30px] -mt-[30px] h-[60px] w-[60px] rounded-full border-2 border-[--color-primary] opacity-0 motion-safe:animate-confirm-ripple" />
        )}
      </div>
    </div>
  );
}

function scoreCaption(state: LoopState): string {
  if (state.status === 'Draft') return 'Waiting for analysis';
  if (state.status === 'Analyzing') {
    return `${state.detectedCount} ${state.detectedCount === 1 ? 'finding' : 'findings'} so far`;
  }
  return `${state.confirmedCount} of ${state.detectedCount} findings confirmed`;
}

/** Eases the displayed score toward its target so the number climbs with the ring instead of jumping. */
function useCountUp(target: number, reducedMotion: boolean): number {
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    if (reducedMotion) {
      currentRef.current = target;
      setValue(target);
      return;
    }

    const from = currentRef.current;
    const start = performance.now();
    let raf = 0;
    function step(now: number) {
      const t = Math.min(1, (now - start) / SCORE_TWEEN_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      currentRef.current = from + (target - from) * eased;
      setValue(Math.round(currentRef.current));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reducedMotion]);

  return value;
}
