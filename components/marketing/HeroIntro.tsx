'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { HeroHandoffLoop } from '@/components/marketing/HeroHandoffLoop';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const STAGGER_MS = 120;
// badge, heading, lede, ctas
const TEXT_ITEM_COUNT = 4;

/**
 * Owns the hero's one-time landing entrance: the badge/heading/lede/CTAs
 * stagger in on first paint, the headline's accent phrase inks in a beat
 * after the rest of the line, and only once all of that has landed does
 * HeroHandoffLoop start its first cycle — so the whole hero reads as one
 * sequence (read this, now watch it happen) instead of two animations
 * racing each other. Plays once; the card's own loop continues on its own
 * after that.
 */
export function HeroIntro() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [accentColored, setAccentColored] = useState(false);
  const [cardIn, setCardIn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduced);

    if (reduced) {
      setVisibleCount(TEXT_ITEM_COUNT);
      setAccentColored(true);
      setCardIn(true);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < TEXT_ITEM_COUNT; i++) {
      timers.push(setTimeout(() => setVisibleCount(i + 1), i * STAGGER_MS));
    }
    timers.push(setTimeout(() => setAccentColored(true), 250));
    timers.push(setTimeout(() => setCardIn(true), TEXT_ITEM_COUNT * STAGGER_MS));

    return () => timers.forEach(clearTimeout);
  }, []);

  function inClass(index: number) {
    return cn(
      'transition-all duration-500 ease-out',
      visibleCount > index ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0',
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
      <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
        <span
          className={cn(
            'rounded-[--radius-full] bg-[--color-primary-light] px-4 py-1.5 text-[length:var(--font-desktop-label-semi-bold-size)] font-semibold text-[--color-primary-dark]',
            inClass(0),
          )}
        >
          Detected. Inferred. Never guessed silently.
        </span>
        <h1
          className={cn(
            'max-w-3xl text-[length:var(--font-mobile-display-semi-bold-size)] font-semibold leading-tight tracking-tight sm:text-[length:var(--font-tablet-display-semi-bold-size)] lg:text-[length:var(--font-desktop-display-semi-bold-size)]',
            inClass(1),
          )}
        >
          <span className="text-[--color-text-primary]">Handoffs your developers</span>{' '}
          <span
            className={cn(
              'transition-colors duration-500',
              accentColored ? 'text-[--color-primary]' : 'text-[--color-text-muted]',
            )}
          >
            can actually trust.
          </span>
        </h1>
        <p
          className={cn(
            'max-w-2xl text-[length:var(--font-desktop-heading-4-regular-size)] text-[--color-text-secondary]',
            inClass(2),
          )}
        >
          BuildBridge reads a finished design and tells you what it detected, what it inferred, and what
          it&apos;s only suggesting — so a designer can confirm the gaps before a developer ever sees them.
        </p>
        <div className={cn('flex flex-wrap justify-center gap-3 pt-2 lg:justify-start', inClass(3))}>
          <Link href="/sign-up" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Create account
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            Sign in
          </Link>
        </div>
      </div>

      <div
        className={cn(
          'min-w-0 transition-all duration-500 ease-out',
          cardIn ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0',
        )}
      >
        {/* From lg up the loop bleeds past the column's right edge, into the
            page margin only (never past the 16px gutter), so the stage scales
            to ~80% instead of ~60% and its text stays readable. The left
            column's width is unaffected. */}
        <HeroHandoffLoop
          startDelayMs={reducedMotion ? 0 : TEXT_ITEM_COUNT * STAGGER_MS}
          className="lg:w-[calc(100%_+_clamp(0px,_(100vw_-_1024px)_/_2,_170px))]"
        />
      </div>
    </div>
  );
}
