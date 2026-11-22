'use client';

import { type ReactNode, type Ref, useEffect, useRef, useState } from 'react';

import { PIN_BASE, PIN_STYLE } from '@/components/marketing/HeroLoopScreen';
import {
  ANALYSIS_STAGES,
  type CursorTarget,
  type LoopRowId,
  type LoopState,
  R2_NEW_VALUE,
  R2_OLD_VALUE,
} from '@/components/marketing/heroLoopTimeline';
import { Check, CheckCircle2, Circle, Clock, Pencil, X } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

type HeroLoopFindingsProps = {
  state: LoopState;
  /** Registers the elements the demo cursor travels to (desktop only). */
  targetRef: (target: CursorTarget) => Ref<HTMLElement>;
};

const MOTION = 'duration-[240ms] ease-[cubic-bezier(0.65,0,0.35,1)]';

/**
 * The Review page's findings panel at the hero's size: the Analysis stage
 * list while analysis runs, then the findings, the critical gap and
 * readiness. Every state here is a real Review state (Confirm, the Modify
 * editor, the expanded gap card), never a hero-only shortcut.
 */
export function HeroLoopFindings({ state, targetRef }: HeroLoopFindingsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const overflow = useListOverflow(listRef, innerRef);

  return (
    <aside className="relative grid min-h-0 grid-rows-[53px_436px_1fr] border-[--color-border] bg-white sm:border-l">
      <div className="relative border-b border-[--color-border]">
        <PanelHeading isShown={state.isAnalyzing}>
          <span className="font-medium text-[--color-text-primary]">Analysis</span>
        </PanelHeading>
        <PanelHeading isShown={!state.isAnalyzing}>
          <span className="font-medium text-[--color-text-primary]">Findings</span>
          <span className="text-[12px] text-[--color-text-secondary]">4 of 11</span>
          <span className="flex-1" />
          <span className="text-[12px] text-[--color-text-secondary]">Screen: Checkout</span>
        </PanelHeading>
      </div>

      <div ref={listRef} className="relative overflow-hidden">
        <AnalysisStages state={state} />

        <div
          ref={innerRef}
          className={cn('grid grid-cols-[minmax(0,1fr)] content-start gap-1 p-3 transition-transform', MOTION)}
          style={{ transform: `translateY(-${state.isListScrolled ? overflow : 0}px)` }}
        >
          <FindingRow
            id="r1"
            state={state}
            pin="1"
            provenance="Detected"
            title="Pay button · radius"
            value="8px  #4F46E5"
            isSelected={state.r1.isSelected}
            side={
              <FadeIn isShown={state.r1.isConfirmed}>
                <ReviewStatusBadge status="Confirmed" />
              </FadeIn>
            }
          >
            <Expander isOpen={state.r1.isOpen}>
              <div className="flex flex-wrap gap-2 pt-3 sm:pl-9">
                <SmallButton ref={targetRef('c1')} isPressed={state.pressed === 'c1'} icon={<Check size={14} />}>
                  Confirm
                </SmallButton>
                <SmallButton icon={<Pencil size={14} />}>Modify</SmallButton>
                <SmallButton icon={<X size={14} />}>Reject</SmallButton>
              </div>
            </Expander>
          </FindingRow>

          <FindingRow
            id="r2"
            state={state}
            pin="2"
            provenance="Inferred"
            title={<span ref={targetRef('r2title')}>Card number · focus ring</span>}
            value={state.r2.isSaved ? R2_NEW_VALUE : R2_OLD_VALUE}
            isSelected={state.r2.isSelected}
            side={
              state.r2.isSaved ? (
                <span className="text-[12px] leading-4 text-[--color-text-secondary]">Modified by designer</span>
              ) : null
            }
          >
            <Expander isOpen={state.r2.isOpen}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 pb-0.5 pt-3 sm:pl-9">
                <div className="flex h-10 items-center overflow-hidden whitespace-nowrap rounded-[8px] border-2 border-[--color-primary] bg-white px-3 font-mono text-[13px] text-[--color-text-primary]">
                  {state.r2.isInputSelected ? (
                    <span className="bg-[--color-primary-light]">{state.r2.input}</span>
                  ) : (
                    <>
                      {state.r2.input}
                      <Caret />
                    </>
                  )}
                </div>
                <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
                  Was {R2_OLD_VALUE} (Inferred). Developers will see your value marked “Modified by designer”.
                </p>
                <div className="flex items-center gap-1 pt-1">
                  <PrimaryButton ref={targetRef('r2save')} isPressed={state.pressed === 'r2save'}>
                    Save change
                  </PrimaryButton>
                  <TextButton>Cancel</TextButton>
                </div>
              </div>
            </Expander>
          </FindingRow>

          <FindingRow
            id="r3"
            state={state}
            pin="3"
            provenance="Suggested"
            title="Pay button · loading"
            value="Spinner only"
          />
          <FindingRow
            id="r4"
            state={state}
            pin="4"
            provenance="Inferred"
            title="Expiry · error state"
            value="Inline, below field"
          />

          <GapCard state={state} targetRef={targetRef} />
        </div>
      </div>

      <Readiness state={state} />
    </aside>
  );
}

function PanelHeading({ isShown, children }: { isShown: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center gap-2 bg-white px-5 transition-opacity duration-150',
        isShown ? 'opacity-100' : 'opacity-0',
      )}
    >
      {children}
    </div>
  );
}

function AnalysisStages({ state }: { state: LoopState }) {
  return (
    <div
      className={cn(
        'absolute inset-0 grid content-start py-2 transition-opacity duration-150',
        state.isAnalyzing ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {ANALYSIS_STAGES.map((stage, i) => {
        const stageState = state.stages[i];
        return (
          <div
            key={stage}
            className={cn(
              'flex h-[34px] items-center gap-3 px-5 text-[13px]',
              stageState === 'now'
                ? 'bg-[--color-background] text-[--color-text-primary]'
                : 'text-[--color-text-secondary]',
            )}
          >
            {stageState === 'done' && <CheckCircle2 size={16} className="text-[--color-text-body]" />}
            {stageState === 'now' && <Clock size={16} className="text-[--color-primary]" />}
            {stageState === 'todo' && <Circle size={16} className="text-[--color-text-dismissed]" />}
            {stage}
            {stageState === 'done' && i === 0 && (
              <span className="ml-auto text-[12px] text-[--color-text-muted]">4 components</span>
            )}
            {stageState === 'now' && <span className="ml-auto text-[12px] text-[--color-text-muted]">In progress</span>}
          </div>
        );
      })}
      <span className="px-5 pt-2 text-[12px] leading-[18px] text-[--color-text-secondary]">
        Findings appear here as each stage finishes.
      </span>
    </div>
  );
}

function FindingRow({
  id,
  state,
  pin,
  provenance,
  title,
  value,
  isSelected = false,
  side,
  children,
}: {
  id: LoopRowId;
  state: LoopState;
  pin: string;
  provenance: ProvenanceType;
  title: ReactNode;
  value: string;
  isSelected?: boolean;
  side?: ReactNode;
  children?: ReactNode;
}) {
  const isShown = state.rowsShown[id];
  return (
    <div
      className={cn(
        'rounded-[8px] border p-3 transition-[opacity,transform,background-color,border-color]',
        MOTION,
        isShown ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0',
        isSelected ? 'border-[--color-border] bg-[--color-surface]' : 'border-transparent',
        state.tapped === id && 'max-sm:bg-[--color-primary-light]',
      )}
    >
      <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-3">
        <span className={cn(PIN_BASE, PIN_STYLE[provenance])}>{pin}</span>
        <div className="min-w-0">
          <span className="block font-medium text-[--color-text-primary]">{title}</span>
          <code className="mt-1 block whitespace-pre font-mono text-[13px] leading-[18px] text-[--color-text-secondary]">
            {value}
          </code>
        </div>
        <div className="grid justify-items-end gap-1">
          <ProvenanceBadge provenance={provenance} />
          {side}
        </div>
      </div>
      {children}
    </div>
  );
}

function GapCard({
  state,
  targetRef,
}: {
  state: LoopState;
  targetRef: (target: CursorTarget) => Ref<HTMLElement>;
}) {
  const { gap } = state;
  const isQuestionShown = !gap.isAnswered && !gap.isOpen;
  return (
    <div
      className={cn(
        'mt-1 rounded-[8px] border bg-white px-3 py-3 transition-[opacity,transform,border-color]',
        MOTION,
        state.isGapShown ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0',
        gap.isSelected ? 'border-[--color-error]' : 'border-[--color-error-light]',
        state.isGapPulsing && 'animate-[gap-pulse_600ms_ease-out_1]',
        state.tapped === 'gap' && 'max-sm:bg-[--color-primary-light]',
      )}
    >
      <div className="flex items-center gap-2 text-[12px] leading-4 text-[--color-text-secondary]">
        <SeverityBadge severity="Critical" />
        {gap.isSelected ? (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <ProvenanceBadge provenance="Inferred" />
            Checkout · Pay button
          </span>
        ) : (
          <span>Gap</span>
        )}
        <FadeIn isShown={gap.isAnswered} className="inline-flex items-center gap-1 font-medium text-[--color-text-primary]">
          <Check size={14} />
          Answered
        </FadeIn>
      </div>

      {isQuestionShown && (
        <p ref={targetRef('gapQ') as Ref<HTMLParagraphElement>} className="m-0 mt-2 text-[--color-text-body]">
          No state for a declined card. Developers would have to guess.
        </p>
      )}
      {gap.isAnswered && (
        <p className="m-0 mt-2 text-[13px] leading-[18px] text-[--color-text-secondary]">
          Your answer: Show “Your card was declined. Try another card.” above Pay. Keep the form filled in and focus
          the card number.
        </p>
      )}

      <Expander isOpen={gap.isOpen}>
        <div className="grid gap-2 pt-3">
          <span className="text-[15px] font-semibold leading-[22px] text-[--color-text-primary]">
            No declined-card state
          </span>
          <p className="m-0 text-[13px] leading-[19px] text-[--color-text-secondary]">
            The design shows success only. What does the form do when the bank says no?
          </p>
          <p className="m-0 text-[13px] leading-[19px] text-[--color-text-secondary]">
            <span className="font-semibold text-[--color-text-body]">Suggested fix:</span> an inline error above Pay with
            a way to try another card.
          </p>
          <span className="text-[12px] font-medium leading-4 text-[--color-text-body]">
            → Answering this makes the handoff ready
          </span>
          <span className="text-[13px] font-medium leading-[18px] text-[--color-text-body]">Your answer</span>
          <div className="min-h-[84px] rounded-[8px] border-2 border-[--color-primary] bg-white px-3 py-3 text-[14px] leading-5 text-[--color-text-body]">
            {gap.typed}
            <Caret />
          </div>
          <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
            Developers see this as the confirmed behavior.
          </p>
          <div className="flex items-center gap-1 pt-1">
            <PrimaryButton ref={targetRef('gapSave')} isPressed={state.pressed === 'gapSave'}>
              Save answer
            </PrimaryButton>
            <TextButton>Cancel</TextButton>
          </div>
        </div>
      </Expander>
    </div>
  );
}

function Readiness({ state }: { state: LoopState }) {
  return (
    <div className="relative grid content-start gap-3 border-t border-[--color-border] px-5 pt-4">
      <span
        className={cn(
          'absolute left-5 top-[22px] text-[12px] leading-4 text-[--color-text-secondary] transition-opacity duration-150',
          state.isAnalyzing ? 'opacity-100' : 'opacity-0',
        )}
      >
        Readiness appears when analysis finishes.
      </span>
      <div
        className={cn(
          'grid gap-3 transition-opacity',
          MOTION,
          state.isScoreShown ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="min-w-[58px] text-[28px] font-semibold leading-9 text-[--color-text-primary] tabular-nums">
            {state.score}%
          </span>
          <span
            className={cn(
              'text-[12px] font-medium leading-4',
              state.isReady ? 'text-[--color-success]' : 'text-[--color-error]',
            )}
          >
            {state.isReady ? 'Ready to share' : 'Not ready · 1 critical gap open'}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[--color-surface]">
          <i
            className={cn(
              'block h-full rounded-full',
              state.isReady ? 'bg-[--color-success]' : 'bg-[--color-warning]',
            )}
            style={{ width: `${state.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Expander({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  return (
    <div className={cn('grid transition-[grid-template-rows]', MOTION, isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function FadeIn({ isShown, className, children }: { isShown: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('transition-opacity duration-150', isShown ? 'opacity-100' : 'opacity-0', className)}>
      {children}
    </span>
  );
}

function Caret() {
  return <span className="ml-px inline-block h-[15px] w-px bg-[--color-text-primary] align-middle" />;
}

const pressedClass = (isPressed?: boolean) => isPressed && 'scale-[0.96] brightness-[0.94]';

function SmallButton({
  ref,
  isPressed,
  icon,
  children,
}: {
  ref?: Ref<HTMLElement>;
  isPressed?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-[8px] border border-[--color-border] bg-white px-3 text-[13px] font-medium text-[--color-text-body] transition-transform duration-100',
        pressedClass(isPressed),
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function PrimaryButton({ ref, isPressed, children }: { ref?: Ref<HTMLElement>; isPressed?: boolean; children: ReactNode }) {
  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      className={cn(
        'inline-flex h-10 items-center rounded-[8px] bg-[--color-primary] px-4 text-[14px] font-semibold text-white transition-transform duration-100',
        pressedClass(isPressed),
      )}
    >
      {children}
    </span>
  );
}

function TextButton({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 items-center px-4 text-[14px] font-semibold text-[--color-text-body]">{children}</span>
  );
}

/**
 * How far the findings list has to scroll so the open gap card fits, kept
 * current while the card's editor expands, as the real panel scrolls it.
 */
function useListOverflow(
  listRef: React.RefObject<HTMLDivElement | null>,
  innerRef: React.RefObject<HTMLDivElement | null>,
): number {
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    const inner = innerRef.current;
    if (!list || !inner) return;
    const measure = () => setOverflow(Math.max(0, inner.scrollHeight - list.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef, innerRef]);

  return overflow;
}

