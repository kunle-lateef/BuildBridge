'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { HeroHandoffLoop } from '@/components/marketing/HeroHandoffLoop';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const STAGGER_MS = 120;
// heading, lede, ctas
const TEXT_ITEM_COUNT = 3;

/**
 * The home hero, laid out as in Figma (`01 — Home` → Hero): the headline on
 * the left, the explanation and call to action on the right, and the Review
 * window full width underneath, so the loop renders large enough to read.
 *
 * Owns the one-time entrance: the text staggers in on first paint, and only
 * once it has landed does HeroHandoffLoop start its first cycle, so the hero
 * reads as one sequence (read this, now watch it happen). Plays once; the
 * loop carries on by itself after that.
 */
export function HeroIntro() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cardIn, setCardIn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduced);

    if (reduced) {
      setVisibleCount(TEXT_ITEM_COUNT);
      setCardIn(true);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < TEXT_ITEM_COUNT; i++) {
      timers.push(setTimeout(() => setVisibleCount(i + 1), i * STAGGER_MS));
    }
    timers.push(setTimeout(() => setCardIn(true), TEXT_ITEM_COUNT * STAGGER_MS));

    return () => timers.forEach(clearTimeout);
  }, []);

  function inClass(index: number) {
    return cn(
      'transition-all duration-500 ease-out',
      visibleCount > index ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
    );
  }

  return (
    <div className={cn(MARKETING_CONTAINER, 'flex flex-col gap-12 pb-20 pt-16')}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,720px)_400px] lg:items-end lg:justify-between lg:gap-20">
        <h1
          className={cn(
            'text-[length:var(--font-mobile-display-semi-bold-size)] font-semibold leading-[1.2] tracking-[-1.5px] text-[--color-text-primary] sm:text-[length:var(--font-desktop-display-semi-bold-size)] lg:text-[60px] lg:leading-[72px]',
            inClass(0),
          )}
        >
          Design handoffs that show their work.
        </h1>
        <div className="flex flex-col gap-8">
          <p className={cn('text-[16px] leading-6 text-[--color-text-secondary]', inClass(1))}>
            Upload finished screens. BuildBridge lists the specs, states and breakpoints it finds and labels each one
            detected, inferred or suggested. You confirm them, then share a read-only link.
          </p>
          {/* Figma pairs this with "See an example handoff"; that button
              waits for the /example page (code-phase-plan.md, decision 2)
              so it never links somewhere that doesn't exist. */}
          <div className={cn('flex flex-wrap gap-3', inClass(2))}>
            <Link href="/sign-up" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Start a handoff
            </Link>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'min-w-0 transition-all duration-500 ease-out',
          cardIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <HeroHandoffLoop startDelayMs={reducedMotion ? 0 : TEXT_ITEM_COUNT * STAGGER_MS} />
      </div>
    </div>
  );
}
