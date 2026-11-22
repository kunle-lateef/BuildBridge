'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { HeroLoopFindings } from '@/components/marketing/HeroLoopFindings';
import { HeroLoopScreen } from '@/components/marketing/HeroLoopScreen';
import {
  type CursorTarget,
  getLoopState,
  INITIAL_MS,
  type LoopState,
  LOOP_MS,
  snapToEvent,
  STILL_MS,
} from '@/components/marketing/heroLoopTimeline';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { CheckCircle2, Link2, X } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type HeroHandoffLoopProps = {
  /** Holds the first cycle until the hero text has finished its own entrance. Never re-applied on later loops. */
  startDelayMs?: number;
  className?: string;
};

const STAGE_WIDTH = 1200;
// A backgrounded tab or a long jank frame shouldn't make the loop leap ahead
// when it resumes. rAF already pauses in hidden tabs; this caps the catch-up.
const MAX_FRAME_MS = 100;
// Where the cursor rests before its first move, in stage pixels.
const CURSOR_START = { x: 1130, y: 664 };

const REVIEW_TABS: { label: string; count?: number; isActive?: boolean }[] = [
  { label: 'Review', count: 26, isActive: true },
  { label: 'Screens', count: 4 },
  { label: 'Responsive', count: 6 },
  { label: 'Developer feedback', count: 2 },
  { label: 'History' },
  { label: 'Notes' },
];

/**
 * The hero's looping product demo, built from the Review page: a checkout
 * screen is analyzed, findings land, the designer confirms a Detected value,
 * corrects an Inferred one, answers the critical gap, and only then is the
 * handoff ready to share. Timing and states live in heroLoopTimeline.ts.
 * Purely decorative (no real handoff, no server action), so the whole thing
 * is aria-hidden and has no focusable controls.
 *
 * From `sm` up it's a fixed 1200×698 stage scaled as one piece to the
 * column's width, so the screen, pins and cursor stay registered to each
 * other at any size. Below `sm` only the findings panel and readiness show,
 * at natural size: no tabs, cursor or dialog, and each tap is a short row
 * highlight.
 *
 * The clock pauses when the loop is scrolled out of view and only
 * re-renders when the timeline crosses an event; CSS transitions carry the
 * motion between. With reduced motion it rests on beat 6 as a still.
 */
export function HeroHandoffLoop({ startDelayMs = 0, className }: HeroHandoffLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const scale = useStageScale(containerRef);
  const ms = useLoopClock({ startDelayMs, isRunning: isInView && !reducedMotion, reducedMotion });
  const state = getLoopState(ms);
  const { targetRef, cursorPoint } = useCursorTargets(stageRef, scale, state.cursor.target);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => setIsInView(entries[0]?.isIntersecting ?? false));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className={cn('relative w-full sm:aspect-[1200/698]', className)}>
      <div
        ref={stageRef}
        className="relative overflow-hidden rounded-[12px] border border-[--color-border] bg-white text-[14px] leading-5 text-[--color-text-body] sm:absolute sm:left-0 sm:top-0 sm:grid sm:h-[698px] sm:w-[1200px] sm:origin-top-left sm:grid-rows-[52px_44px_1fr] sm:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_40px_-16px_rgba(15,23,42,0.22)]"
        // The stage's scale depends on the measured column width, which no
        // Tailwind class can express.
        style={scale === null ? undefined : { transform: `scale(${scale})` }}
      >
        <TitleBar state={state} shareRef={targetRef('share')} />
        <div className="hidden items-end gap-6 border-b border-[--color-border] px-5 text-[--color-text-secondary] sm:flex">
          {REVIEW_TABS.map((tab) => (
            <span
              key={tab.label}
              className={cn(
                'flex items-baseline gap-2 pb-3',
                tab.isActive && 'font-medium text-[--color-text-primary] shadow-[inset_0_-2px_0_var(--color-primary)]',
              )}
            >
              {tab.label}
              {tab.count !== undefined && <i className="text-[12px] not-italic text-[--color-text-muted]">{tab.count}</i>}
            </span>
          ))}
        </div>

        <div className="min-h-0 sm:grid sm:grid-cols-[808px_392px]">
          <div className="hidden min-h-0 sm:grid">
            <HeroLoopScreen state={state} />
          </div>
          <HeroLoopFindings state={state} targetRef={targetRef} />
        </div>

        <ShareDialog state={state} copyRef={targetRef('copyLink')} />
        <Toast isShown={state.isToastShown} />

        <div
          className={cn(
            'pointer-events-none absolute left-0 top-0 z-10 hidden origin-[2px_2px] sm:block',
            state.cursor.isVisible ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            transform: `translate(${cursorPoint.x - 2}px, ${cursorPoint.y - 2}px)`,
            transition: `transform ${state.cursor.moveMs}ms cubic-bezier(0.65, 0, 0.35, 1), opacity 300ms ease-out`,
          }}
        >
          <svg
            width="20"
            height="24"
            viewBox="0 0 18 22"
            className={cn(
              'drop-shadow-[0_2px_3px_rgba(15,23,42,0.3)] transition-transform duration-100',
              state.cursor.isPressed && 'scale-[0.88]',
            )}
          >
            <path
              d="M2 2v16l4.2-3.9 2.9 6.4 2.6-1.2-2.9-6.3H15z"
              fill="white"
              stroke="var(--color-text-primary)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function TitleBar({ state, shareRef }: { state: LoopState; shareRef: React.Ref<HTMLElement> }) {
  return (
    <div className="hidden items-center gap-2 border-b border-[--color-border] pl-5 pr-4 text-[--color-text-secondary] sm:flex">
      <span>Handoffs</span>
      <span>/</span>
      <span className="font-medium text-[--color-text-primary]">Ledger · Checkout v3</span>
      <span className="text-[12px] leading-4">v3</span>
      <HandoffStatusBadge status={state.status} />
      <span className="flex-1" />
      <span className="mr-2 text-[12px] leading-4">Example handoff</span>
      <span
        ref={shareRef as React.Ref<HTMLSpanElement>}
        className={cn(
          'inline-flex h-[42px] items-center rounded-[8px] border border-[--color-border] bg-white px-4 font-semibold text-[--color-text-body] transition-transform duration-100',
          state.pressed === 'share' && 'scale-[0.96] brightness-[0.94]',
        )}
      >
        Share handoff
      </span>
    </div>
  );
}

function ShareDialog({ state, copyRef }: { state: LoopState; copyRef: React.Ref<HTMLElement> }) {
  const isOpen = state.isDialogOpen;
  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[7] hidden bg-[rgba(14,19,32,0.4)] transition-opacity duration-200 sm:block',
          isOpen ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'absolute left-1/2 top-1/2 z-[8] -ml-[220px] -mt-[130px] hidden w-[440px] rounded-[12px] bg-white px-6 py-5 text-[--color-text-body] shadow-[0_20px_48px_-12px_rgba(15,23,42,0.35)] transition-[opacity,transform] duration-200 sm:block',
          isOpen ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0',
        )}
      >
        <div className="flex items-center justify-between text-[16px] font-semibold leading-6 text-[--color-text-primary]">
          Share handoff
          <X size={16} className="text-[--color-text-secondary]" />
        </div>
        <p className="mb-4 mt-2 text-[13px] leading-5 text-[--color-text-secondary]">
          Anyone with this link can view the handoff in their browser, read-only. They don’t need an account.
        </p>
        <div className="mb-2 text-[12px] font-medium">Share link</div>
        <div className="flex gap-2">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap rounded-[8px] border border-[--color-border] px-3 text-[12.5px]">
            <Link2 size={13} className="shrink-0 text-[--color-text-muted]" />
            build-bridge-alpha.vercel.app/share/7f3kq9
          </div>
          <span
            ref={copyRef as React.Ref<HTMLSpanElement>}
            className={cn(
              'inline-flex h-9 items-center rounded-[8px] bg-[--color-primary] px-4 text-[13px] font-semibold text-white transition-transform duration-100',
              state.pressed === 'copyLink' && 'scale-[0.96] brightness-[0.94]',
            )}
          >
            Copy link
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-[--color-text-secondary]">
          <span className="font-medium text-[--color-text-body]">Active</span>
          Created just now · No expiry
          <span className="ml-auto font-medium text-[--color-error]">Revoke link</span>
        </div>
        <div className="mt-4 flex justify-end border-t border-[--color-border] pt-3">
          <span className="inline-flex h-9 items-center rounded-[8px] border border-[--color-border] px-4 text-[13px] font-semibold">
            Done
          </span>
        </div>
      </div>
    </>
  );
}

function Toast({ isShown }: { isShown: boolean }) {
  return (
    <div
      className={cn(
        'absolute bottom-4 z-[9] flex items-center gap-3 rounded-[8px] border border-[--color-border] bg-white px-3 py-3 text-[--color-text-body] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] transition-opacity duration-150',
        'left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0',
        isShown ? 'opacity-100' : 'opacity-0',
      )}
    >
      <CheckCircle2 size={16} />
      Link copied
      <X size={14} className="ml-1 text-[--color-text-muted]" />
    </div>
  );
}

/**
 * Collects the elements the cursor travels to and measures the current
 * target's point in stage pixels (unscaled), so the cursor lands on the
 * real button wherever layout puts it. Measured after each target change,
 * once the panel it lives in has opened.
 */
function useCursorTargets(
  stageRef: RefObject<HTMLDivElement | null>,
  scale: number | null,
  target: CursorTarget,
) {
  const elements = useRef(new Map<CursorTarget, HTMLElement>());
  const [cursorPoint, setCursorPoint] = useState(CURSOR_START);

  // One stable callback per target, so refs don't detach and re-attach on
  // every render of the clock.
  const callbacks = useRef(new Map<CursorTarget, (element: HTMLElement | null) => void>());
  const targetRef = useCallback((name: CursorTarget) => {
    let callback = callbacks.current.get(name);
    if (!callback) {
      callback = (element: HTMLElement | null) => {
        if (element) elements.current.set(name, element);
        else elements.current.delete(name);
      };
      callbacks.current.set(name, callback);
    }
    return callback;
  }, []);

  useLayoutEffect(() => {
    if (target === 'start') {
      setCursorPoint(CURSOR_START);
      return;
    }
    const stage = stageRef.current;
    const element = elements.current.get(target);
    if (!stage || !element || !scale) return;
    const s = stage.getBoundingClientRect();
    const r = element.getBoundingClientRect();
    setCursorPoint({
      x: (r.left - s.left + r.width * 0.5) / scale,
      y: (r.top - s.top + r.height * 0.6) / scale,
    });
  }, [target, scale, stageRef]);

  return { targetRef, cursorPoint };
}

/** Width-to-stage scale from `sm` up; null below it, where the stage isn't scaled. */
function useStageScale(containerRef: RefObject<HTMLDivElement | null>): number | null {
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const query = window.matchMedia('(min-width: 640px)');

    function measure() {
      setScale(query.matches ? container!.clientWidth / STAGE_WIDTH : null);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    query.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', measure);
    };
  }, [containerRef]);

  return scale;
}

function useLoopClock({
  startDelayMs,
  isRunning,
  reducedMotion,
}: {
  startDelayMs: number;
  isRunning: boolean;
  reducedMotion: boolean;
}): number {
  const [ms, setMs] = useState(INITIAL_MS);
  const elapsedRef = useRef(INITIAL_MS);
  const delayLeftRef = useRef(startDelayMs);

  useEffect(() => {
    if (reducedMotion) setMs(STILL_MS);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isRunning) return;

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const delta = Math.min(now - last, MAX_FRAME_MS);
      last = now;
      if (delayLeftRef.current > 0) {
        delayLeftRef.current -= delta;
      } else {
        elapsedRef.current = (elapsedRef.current + delta) % LOOP_MS;
        setMs(snapToEvent(elapsedRef.current));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isRunning]);

  return ms;
}
