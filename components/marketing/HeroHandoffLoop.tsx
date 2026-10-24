'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

import { HeroLoopFindings } from '@/components/marketing/HeroLoopFindings';
import { HeroLoopScreen } from '@/components/marketing/HeroLoopScreen';
import {
  type CursorTarget,
  getLoopState,
  INITIAL_MS,
  LOOP_MS,
  snapToEvent,
  STILL_MS,
} from '@/components/marketing/heroLoopTimeline';
import { cn } from '@/lib/cn';

type HeroHandoffLoopProps = {
  /** Holds the first cycle until the hero text has finished its own entrance. Never re-applied on later loops. */
  startDelayMs?: number;
  className?: string;
};

const STAGE_WIDTH = 770;
// A backgrounded tab or a long jank frame shouldn't make the loop leap ahead
// when it resumes — rAF already pauses in hidden tabs, this caps the catch-up.
const MAX_FRAME_MS = 100;

// Arrow tip offsets (-3px) folded in; targets are the action button centers
// in HeroLoopFindings' rows, in stage coordinates.
const CURSOR_POSITION: Record<CursorTarget, string> = {
  start: 'translate-x-[767px] translate-y-[741px]',
  focus: 'translate-x-[687px] translate-y-[199px]',
  button: 'translate-x-[687px] translate-y-[277px]',
  loading: 'translate-x-[687px] translate-y-[355px]',
  tablet: 'translate-x-[687px] translate-y-[433px]',
  exit: 'translate-x-[657px] translate-y-[687px]',
};

/**
 * The hero's looping product demo: a checkout screen is uploaded and
 * analyzed, four findings appear with their provenance or severity, a
 * designer confirms each one, the readiness score fills, and only then is a
 * read-only link offered. Purely decorative (no real handoff, no server
 * action), so the whole thing is aria-hidden and contains no focusable
 * controls.
 *
 * From `sm` up it's a fixed 770×744 stage scaled as one piece to the
 * column's width, so the screen, outlines and cursor stay registered to each
 * other at any size. Below `sm` that scale would make the text unreadable,
 * so only the findings panel shows, at its natural size.
 *
 * The clock pauses whenever the loop is scrolled out of view, and only
 * re-renders when the timeline crosses an event — CSS transitions carry the
 * motion in between.
 */
export function HeroHandoffLoop({ startDelayMs = 0, className }: HeroHandoffLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const scale = useStageScale(containerRef);
  const ms = useLoopClock({ startDelayMs, isRunning: isInView && !reducedMotion, reducedMotion });
  const state = getLoopState(ms);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) =>
      setIsInView(entries[0]?.isIntersecting ?? false),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('relative w-full sm:aspect-[770/744]', className)}
    >
      <div
        className="relative flex flex-col sm:absolute sm:left-0 sm:top-0 sm:block sm:h-[744px] sm:w-[770px] sm:origin-top-left"
        // The one inline style: the stage's scale depends on the measured
        // column width, which no Tailwind class can express.
        style={scale === null ? undefined : { transform: `scale(${scale})` }}
      >
        <div className="pointer-events-none absolute -inset-10 hidden bg-[radial-gradient(ellipse_460px_400px_at_425px_410px,rgba(79,70,229,0.09),transparent_70%)] sm:block" />
        <div className="hidden sm:block">
          <HeroLoopScreen state={state} />
        </div>
        <HeroLoopFindings state={state} reducedMotion={reducedMotion} />
        <div
          className={cn(
            'pointer-events-none absolute left-0 top-0 z-[9] hidden sm:block',
            CURSOR_POSITION[state.cursor.target],
            // The first leg (in from the corner) travels furthest, so it gets more time.
            state.cursor.target === 'focus'
              ? '[transition:transform_1000ms_cubic-bezier(0.65,0,0.35,1),opacity_300ms_ease-out]'
              : '[transition:transform_700ms_cubic-bezier(0.65,0,0.35,1),opacity_300ms_ease-out]',
            state.cursor.isVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <svg
            width="26"
            height="30"
            viewBox="0 0 26 30"
            className={cn(
              'drop-shadow-[0_3px_4px_rgba(15,23,42,0.3)] transition-transform duration-100',
              state.cursor.isPressed && 'scale-[0.88]',
            )}
          >
            <path
              d="M2 2 L2 24 L8 18.5 L12 27.5 L16 25.7 L12 17 L20 17 Z"
              fill="var(--color-text-primary)"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
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
