import Link from 'next/link';

import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { buttonVariants } from '@/components/ui/Button';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';

/**
 * The closing section (v3) — Figma `01 — Home` → "Final CTA": one headline,
 * one line, the call to action, and a card quoting the designer's answer to
 * the declined-card gap, as the developer sees it.
 */
export function ClosingSection() {
  return (
    <section>
      <div
        className={cn(
          MARKETING_CONTAINER,
          'grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-[540px_minmax(0,564px)] lg:justify-between lg:gap-24 lg:py-32',
        )}
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-[32px] font-semibold leading-10 tracking-[-1.5px] text-[--color-text-primary] sm:text-[48px] sm:leading-[56px]">
            Give developers a handoff they don’t have to double‑check.
          </h2>
          <p className="max-w-[460px] text-[16px] leading-6 text-[--color-text-secondary]">
            They get every value you confirmed and your answer to every gap, in one read-only link.
          </p>
          {/* Figma pairs this with "See an example handoff", which waits for
              the /example page (code-phase-plan.md, decision 2). */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/sign-up" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Start a handoff
            </Link>
          </div>
        </div>

        <figure className="m-0 flex flex-col overflow-hidden rounded-[16px] border border-[--color-border] bg-white">
          <figcaption className="border-b border-[--color-border] px-6 py-5 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-muted] sm:px-8">
            Example handoff · what the developer sees
          </figcaption>
          <div className="flex flex-col gap-5 px-6 pb-8 pt-7 sm:px-8">
            <div className="flex items-center gap-2.5">
              <SeverityBadge severity="Critical" />
              <span className="text-[16px] font-semibold leading-6 text-[--color-text-primary]">No declined-card state</span>
            </div>
            <blockquote className="m-0 text-[18px] leading-[27px] tracking-[-0.5px] text-[--color-text-primary] sm:text-[22px] sm:leading-8">
              “Show ‘Your card was declined. Try another card.’ above Pay. Keep the form filled in and focus the card
              number.”
            </blockquote>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-full bg-[--color-primary-light] text-[12px] font-medium leading-4 text-[--color-primary-dark]"
              >
                D
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">Dami Ajayi, designer</span>
                <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-muted]">
                  Answered 8 min ago · Checkout · Pay button
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border-t border-[--color-border] bg-[--color-background] px-6 py-4 text-[14px] leading-5 sm:px-8">
            <span className="text-[--color-text-secondary]">Ledger · Checkout v3</span>
            <span className="flex-1" />
            <span className="font-medium text-[--color-text-primary]">85%</span>
            <span className="h-1 w-[72px] overflow-hidden rounded-full bg-[--color-border]">
              <span className="block h-full w-[85%] rounded-full bg-[--color-success]" />
            </span>
            <span className="font-medium text-[--color-success]">Ready</span>
          </div>
        </figure>
      </div>
    </section>
  );
}
