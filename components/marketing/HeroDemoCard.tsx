'use client';

import { useEffect, useRef, useState } from 'react';

import { buttonVariants } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { cn } from '@/lib/cn';

const CYCLE_MS = 9200;
const TARGET_SCORE = 82;

type HeroDemoCardProps = {
  /** Delays only the very first cycle — lets the hero text finish its own
   * entrance first, so the card reads as "and now watch it happen" rather
   * than racing the headline. Never applied to subsequent loop resets. */
  startDelayMs?: number;
};

/**
 * A purely decorative, looping 3-beat demo — upload, analyze, confirm —
 * living in the marketing hero. Not the real review UI (no server action,
 * no real handoff), so every "button" here is a styled `<span>` via the
 * real buttonVariants classes, never an actual `<button>`: the whole card
 * is aria-hidden, and a real focusable-but-inert control inside an
 * aria-hidden subtree is a genuine keyboard-trap bug (aria-hidden removes
 * it from the accessibility tree but not from Tab order), not just a
 * theoretical one. ProvenanceBadge/ReviewStatusBadge are the real
 * components, reused as-is for visual fidelity with the actual product.
 */
export function HeroDemoCard({ startDelayMs = 0 }: HeroDemoCardProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [stage, setStage] = useState<'upload' | 'findings'>('upload');
  const [screenVisible, setScreenVisible] = useState(false);
  const [isFirstReveal, setIsFirstReveal] = useState(true);
  const [uploadDone, setUploadDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(false);
  const [findingsEntered, setFindingsEntered] = useState(false);
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
      setStage('findings');
      setScreenVisible(true);
      setUploadDone(true);
      setFound(true);
      setFindingsEntered(true);
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
      setStage('upload');
      setScreenVisible(false);
      setIsFirstReveal(!hasRunOnce.current);
      setUploadDone(false);
      setScanning(false);
      setFound(false);
      setFindingsEntered(false);
      setReviewStatus('Unreviewed');
      setConfirmPulse(false);
      setCardPulse(false);
      setScoreVisible(false);

      requestAnimationFrame(() => {
        if (!cancelled) setScreenVisible(true);
      });
      schedule(() => setUploadDone(true), 100);
      schedule(() => setScanning(true), 1500);
      schedule(() => setFound(true), 2350);
      schedule(() => {
        setStage('findings');
        requestAnimationFrame(() => {
          if (!cancelled) setFindingsEntered(true);
        });
      }, 3100);
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
        'relative h-[400px] overflow-hidden rounded-[--radius-xl] border-[--color-primary-light] bg-[image:radial-gradient(140%_100%_at_100%_0%,rgba(99,102,241,0.09),transparent_60%)] p-5 shadow-[0_20px_45px_-20px_rgba(79,70,229,0.35)] transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        cardPulse && 'scale-[1.018]',
      )}
    >
      {/* Beat 1 + 2 — upload and scan */}
      <div
        className={cn(
          'absolute inset-5 flex flex-col gap-4 transition-opacity duration-300',
          stage !== 'upload' && 'pointer-events-none opacity-0',
        )}
      >
        <div
          className={cn(
            'relative flex flex-1 flex-col gap-2.5 overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] p-3.5 transition-all',
            isFirstReveal
              ? 'duration-[550ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]'
              : 'duration-500 ease-out',
            found && 'border-[--color-primary-light]',
            screenVisible ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0',
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
                'absolute -right-2 -top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[--color-primary] text-[10px] font-bold text-white shadow-[0_0_0_3px_var(--color-primary-light)] transition-transform duration-200',
                found ? 'scale-100' : 'scale-0',
              )}
            >
              1
            </span>
          </div>
          <div
            className={cn(
              'absolute left-3.5 right-3.5 h-0.5 bg-[linear-gradient(90deg,transparent,var(--color-primary),transparent)] transition-[top] duration-[1200ms] ease-linear',
              scanning ? 'top-[calc(100%-16px)] opacity-100' : 'top-3.5 opacity-0',
            )}
          />
        </div>
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

      {/* Beat 3 — findings */}
      <div
        className={cn(
          'absolute inset-5 flex flex-col gap-3.5 transition-opacity duration-300',
          stage !== 'findings' && 'pointer-events-none opacity-0',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 transition-all duration-[400ms] ease-out',
            findingsEntered ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          <span className="relative h-6 w-8 shrink-0 rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] after:absolute after:bottom-1 after:left-1 after:right-1 after:h-1.5 after:rounded-[--radius-sm] after:bg-[--color-primary] after:opacity-60 after:content-['']" />
          <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-secondary]">
            Checkout Redesign — Screen 1
          </span>
        </div>
        <div
          className={cn(
            'flex items-center gap-3 transition-all delay-100 duration-[400ms] ease-out',
            findingsEntered ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          <span className="h-[26px] w-12 shrink-0 rounded-[--radius-sm] bg-[image:var(--gradient-primary)]" />
          <span className="font-medium text-[--color-text-primary]">Primary Button</span>
          <ProvenanceBadge provenance="Detected" className="ml-auto" />
        </div>
        <div
          className={cn(
            'flex items-center justify-between border-t border-[--color-border] pt-3.5 transition-all delay-200 duration-[400ms] ease-out',
            findingsEntered ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          <span className="text-[--color-text-secondary]">Review status</span>
          <ReviewStatusBadge status={reviewStatus} />
        </div>
        <div
          className={cn(
            'flex gap-2 overflow-hidden transition-all duration-300',
            reviewStatus === 'Confirmed' ? 'max-h-0 -mt-3.5 opacity-0' : 'max-h-11 opacity-100',
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
        <div
          className={cn(
            'mt-auto flex items-baseline gap-2 border-t border-[--color-border] pt-3.5 transition-all duration-500',
            scoreVisible ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          <span className="font-mono text-[length:var(--font-desktop-heading-1-bold-size)] font-bold text-[--color-text-primary]">
            {score}%
          </span>
          <span className="text-[--color-text-secondary]">Readiness score</span>
        </div>
      </div>
    </Card>
  );
}
