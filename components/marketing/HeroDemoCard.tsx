'use client';

import { useEffect, useRef, useState } from 'react';

import { buttonVariants } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { cn } from '@/lib/cn';

const CYCLE_MS = 9200;
const TARGET_SCORE = 82;
const RING_RADIUS = 32;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type HeroDemoCardProps = {
  /** Delays only the very first cycle — lets the hero text finish its own
   * entrance first, so the card reads as "and now watch it happen" rather
   * than racing the headline. Never applied to subsequent loop resets. */
  startDelayMs?: number;
};

/**
 * A purely decorative, looping demo — upload, analyze, confirm — living in
 * the marketing hero. Not the real review UI (no server action, no real
 * handoff), so every "button" here is a styled `<span>` via the real
 * buttonVariants classes, never an actual `<button>`: the whole card is
 * aria-hidden, and a real focusable-but-inert control inside an aria-hidden
 * subtree is a genuine keyboard-trap bug (aria-hidden removes it from the
 * accessibility tree but not from Tab order), not just a theoretical one.
 * ProvenanceBadge/ReviewStatusBadge are the real components, reused as-is
 * for visual fidelity with the actual product.
 *
 * The screen mockup stays visible the whole cycle (rather than being
 * swapped out for a findings list) specifically so the numbered pin has
 * something to stay anchored to — this mirrors the real review page's
 * Finding Pins (lib/screenPins.ts), giving the hero a concrete product
 * behavior to preview instead of an abstract "upload, then a list appears"
 * mockup. The score is an SVG ring for the same reason ComponentReviewCard's
 * readiness display favors visual encoding over a bare number wherever the
 * design system allows it.
 */
export function HeroDemoCard({ startDelayMs = 0 }: HeroDemoCardProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isFirstReveal, setIsFirstReveal] = useState(true);
  const [uploadDone, setUploadDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(false);
  const [pinShown, setPinShown] = useState(false);
  const [panelShown, setPanelShown] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'Unreviewed' | 'Confirmed'>('Unreviewed');
  const [confirmPulse, setConfirmPulse] = useState(false);
  const [cardPulse, setCardPulse] = useState(false);
  const [scoreVisible, setScoreVisible] = useState(false);
  const [score, setScore] = useState(0);
  const hasRunOnce = useRef(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setUploadDone(true);
      setFound(true);
      setPinShown(true);
      setPanelShown(true);
      setReviewStatus('Confirmed');
      setScoreVisible(true);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    function schedule(fn: () => void, delay: number) {
      timers.push(
        setTimeout(() => {
          if (!cancelled) fn();
        }, delay),
      );
    }

    function runCycle() {
      setIsFirstReveal(!hasRunOnce.current);
      setUploadDone(false);
      setScanning(false);
      setFound(false);
      setPinShown(false);
      setPanelShown(false);
      setReviewStatus('Unreviewed');
      setConfirmPulse(false);
      setCardPulse(false);
      setScoreVisible(false);

      schedule(() => setUploadDone(true), 100);
      schedule(() => setScanning(true), 1500);
      schedule(() => {
        setScanning(false);
        setFound(true);
      }, 2350);
      schedule(() => setPinShown(true), 2500);
      schedule(() => setPanelShown(true), 2800);
      schedule(() => setConfirmPulse(true), 5300);
      schedule(() => {
        setConfirmPulse(false);
        setReviewStatus('Confirmed');
        setScoreVisible(true);
        setCardPulse(true);
        schedule(() => setCardPulse(false), 220);
      }, 5600);
      schedule(() => {
        hasRunOnce.current = true;
        runCycle();
      }, CYCLE_MS);
    }

    schedule(runCycle, hasRunOnce.current ? 0 : startDelayMs);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startDelayMs is only meant to apply once, not re-trigger the effect
  }, [reducedMotion]);

  useEffect(() => {
    if (!scoreVisible) {
      setScore(0);
      return;
    }
    if (reducedMotion) {
      setScore(TARGET_SCORE);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const duration = 700;
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      setScore(Math.round(TARGET_SCORE * t));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scoreVisible, reducedMotion]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - score / 100);

  return (
    <Card
      aria-hidden="true"
      className={cn(
        // Bolder than a standard Card on purpose — a soft branded tint and a
        // colored glow, not the plain white/gray-border look every other
        // Card in the app uses. The glow is a deliberate, discussed
        // exception to design-system.md's "shadows reserved for true
        // overlays" rule: this is a marketing hero showcase, not app
        // content, and the rule's rationale (don't fake elevation on
        // regular UI) doesn't apply to a page that has no "regular UI" to
        // stay consistent with in the first place.
        'relative flex h-[400px] flex-col gap-3 overflow-hidden rounded-[--radius-xl] border-[--color-primary-light] bg-[image:radial-gradient(140%_100%_at_100%_0%,rgba(99,102,241,0.09),transparent_60%)] p-5 shadow-[0_20px_45px_-20px_rgba(79,70,229,0.35)] transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        cardPulse && 'scale-[1.018]',
      )}
    >
      {/* Screen canvas — persists across the whole cycle so the pin has a
          fixed anchor, rather than being swapped for a findings list. */}
      <div
        className={cn(
          'relative flex flex-1 flex-col gap-2.5 overflow-visible rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] p-3.5 transition-all',
          isFirstReveal ? 'duration-[550ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]' : 'duration-500 ease-out',
          found && 'border-[--color-primary-light]',
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[image:var(--gradient-primary)]" />
          <div className="h-2 w-[55%] rounded-[--radius-sm] bg-[--color-border]" />
        </div>
        <div className="h-2 w-[42%] rounded-[--radius-sm] bg-[--color-border]" />
        <div className="mt-1 flex gap-2">
          <div className="relative h-8 flex-1 overflow-hidden rounded-[--radius-sm] border border-[--color-border] bg-[--color-background]">
            <span className="absolute left-1.5 right-2.5 top-2 h-1 rounded-[--radius-sm] bg-[--color-border]" />
          </div>
          <div className="relative h-8 flex-1 overflow-hidden rounded-[--radius-sm] border border-[--color-border] bg-[--color-background]">
            <span className="absolute left-1.5 right-2.5 top-2 h-1 rounded-[--radius-sm] bg-[--color-border]" />
          </div>
        </div>

        <div
          className={cn(
            'relative mt-auto h-[26px] w-[84px] rounded-[--radius-sm] bg-[image:var(--gradient-primary)] transition-opacity duration-500',
            found ? 'opacity-100' : 'opacity-35',
          )}
        >
          <span
            className={cn(
              'absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[--color-primary] text-[11px] font-bold text-white shadow-[0_3px_10px_-2px_rgba(79,70,229,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
              pinShown ? 'scale-100' : 'scale-0',
            )}
          >
            {pinShown && (
              <span className="absolute -inset-2 rounded-full border-2 border-[--color-primary] motion-safe:animate-pin-halo" />
            )}
            1
          </span>
        </div>

        <div
          className={cn(
            'absolute left-3.5 right-3.5 h-0.5 bg-[linear-gradient(90deg,transparent,var(--color-primary),transparent)] transition-[top] duration-[1200ms] ease-linear',
            scanning ? 'top-[calc(100%-16px)] opacity-100' : 'top-3.5 opacity-0',
          )}
        />

        {/* Connector down to the finding panel below */}
        <svg
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -bottom-3 right-[38px] h-3 w-px overflow-visible transition-opacity duration-200',
            panelShown ? 'opacity-55' : 'opacity-0',
          )}
        >
          <line x1="0" y1="0" x2="0" y2="12" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      </div>

      {/* Upload/scan status — fades out once the finding is found */}
      <div
        className={cn(
          'flex h-[30px] flex-col gap-1.5 transition-opacity duration-300',
          found && 'pointer-events-none absolute opacity-0',
        )}
      >
        <div className="flex h-[18px] items-center gap-2 text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-secondary]">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full bg-[--color-primary] motion-safe:animate-pulse',
              !scanning && 'invisible',
            )}
          />
          {scanning ? 'Analyzing…' : 'Uploading screen…'}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[--color-border]">
          <div
            className={cn(
              'h-full rounded-full bg-[image:var(--gradient-primary)] transition-[width] duration-[1300ms] ease-out',
              uploadDone ? 'w-full' : 'w-0',
            )}
          />
        </div>
      </div>

      {/* Finding panel — replaces the upload status once the pin lands */}
      <div
        className={cn(
          'flex flex-col gap-2.5 transition-all duration-300',
          !found && 'pointer-events-none absolute opacity-0',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 transition-all duration-[400ms] ease-out',
            panelShown ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          <span className="h-[26px] w-12 shrink-0 rounded-[--radius-sm] bg-[image:var(--gradient-primary)]" />
          <span className="font-medium text-[--color-text-primary]">Primary Button</span>
          <ProvenanceBadge provenance="Detected" className="ml-auto" />
        </div>

        <div
          className={cn(
            'flex items-center justify-between transition-all delay-100 duration-[400ms] ease-out',
            panelShown ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          <span className="text-[--color-text-secondary]">Review status</span>
          <ReviewStatusBadge status={reviewStatus} />
        </div>

        <div
          className={cn(
            'flex gap-2 overflow-hidden transition-all duration-300',
            reviewStatus === 'Confirmed' ? 'max-h-0 opacity-0' : 'max-h-11 opacity-100',
          )}
        >
          <span
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'border-[--color-success] text-[--color-success]',
              confirmPulse && 'bg-[--color-success-light]',
            )}
          >
            <span
              className={cn(
                'inline-block w-0 overflow-hidden font-bold opacity-0 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                confirmPulse && 'w-3 opacity-100',
              )}
            >
              ✓
            </span>
            Confirm
          </span>
          <span className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'text-[--color-text-dismissed]')}>
            Reject
          </span>
        </div>
      </div>

      {/* Score ring */}
      <div
        className={cn(
          'mt-auto flex items-center gap-4 border-t border-[--color-border] pt-3.5 transition-all duration-500',
          scoreVisible ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
        )}
      >
        <div className="relative h-[68px] w-[68px] shrink-0">
          <svg width="68" height="68" viewBox="0 0 76 76" aria-hidden="true">
            <circle cx="38" cy="38" r={RING_RADIUS} fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="38"
              cy="38"
              r={RING_RADIUS}
              fill="none"
              stroke="url(#hero-score-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 38 38)"
            />
            <defs>
              <linearGradient id="hero-score-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#433bca" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[length:var(--font-desktop-heading-4-semi-bold-size)] font-bold text-[--color-text-primary]">
            {score}%
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-[--color-text-primary]">Readiness score</span>
          <span className="text-[--color-text-secondary]">1 of 1 findings confirmed</span>
        </div>
      </div>
    </Card>
  );
}
