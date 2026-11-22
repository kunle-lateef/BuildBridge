import type { Metadata } from 'next';
import Link from 'next/link';

import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { buttonVariants } from '@/components/ui/Button';
import { Check } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { ACTIVE_HANDOFF_CAP } from '@/lib/plan-limits';

export const metadata: Metadata = {
  title: 'Pricing — BuildBridge',
  description: 'Start free. Move to Team when you need more handoffs running at once.',
};

// Mirrors prisma/schema.prisma's `User.analysisQuota` default. Kept as a
// constant here rather than read from Prisma, since a schema default isn't
// importable at runtime — update both together.
const FREE_ANALYSES_PER_MONTH = 5;

// No public contact address exists yet. While this is null the Team card
// shows no button rather than one that goes nowhere.
const TEAM_CONTACT_HREF: string | null = null;

type Plan = {
  name: string;
  price: string;
  summary: string;
  includes: string[];
  cta: { href: string; label: string; variant: 'primary' | 'secondary' } | null;
  ctaFallback?: string;
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    summary: 'For one designer getting handoffs right.',
    includes: [
      `${FREE_ANALYSES_PER_MONTH} analyses each month. Running one again on an unchanged handoff doesn’t count.`,
      `${ACTIVE_HANDOFF_CAP.Free} active handoffs at a time. Archived ones keep their share links working.`,
      'Guided review, readiness score and gap answers',
      'Read-only share links. Developers never need an account or a seat.',
    ],
    cta: { href: '/sign-up', label: 'Start a handoff', variant: 'primary' },
  },
  {
    name: 'Team',
    price: 'Talk to us',
    summary: 'For teams that hand off several flows at once.',
    includes: [
      `Up to ${ACTIVE_HANDOFF_CAP.Paid} active handoffs`,
      'More analyses each month, set with you',
      'Everything in Free',
    ],
    cta: TEAM_CONTACT_HREF ? { href: TEAM_CONTACT_HREF, label: 'Talk to us', variant: 'secondary' } : null,
    ctaFallback: 'Contact details are coming soon.',
  },
];

const QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'What counts as an analysis?',
    answer:
      'Running BuildBridge on a handoff’s screens. Running it again on a handoff that hasn’t changed reuses the last result and doesn’t use one.',
  },
  {
    question: 'Do developers need a plan?',
    answer: 'No. Developers open the share link in their browser. They don’t need an account, a seat or a plan.',
  },
  {
    question: `What happens when I reach ${ACTIVE_HANDOFF_CAP.Free} active handoffs?`,
    answer:
      'Archive one to start another. Archived handoffs don’t count toward the limit, and their share links keep working.',
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader activePage="pricing" />
      <main className="flex flex-1 flex-col">
        <div className={cn(MARKETING_CONTAINER, 'flex flex-col gap-14 pb-28 pt-24')}>
          <div className="flex max-w-xl flex-col gap-4">
            <h1 className="text-[length:var(--font-mobile-display-semi-bold-size)] font-semibold leading-tight text-[--color-text-primary] sm:text-[length:var(--font-desktop-display-semi-bold-size)]">
              Pricing
            </h1>
            <p className="text-[--color-text-secondary]">
              Start free with everything the product does. Move to Team when you need more handoffs running at once.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <section
                key={plan.name}
                aria-labelledby={`plan-${plan.name}`}
                className="flex flex-col gap-6 rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] p-6 sm:p-8"
              >
                <div className="flex flex-col gap-2">
                  <h2
                    id={`plan-${plan.name}`}
                    className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]"
                  >
                    {plan.name}
                  </h2>
                  <span className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
                    {plan.price}
                  </span>
                  <p className="text-[--color-text-secondary]">{plan.summary}</p>
                </div>

                {plan.cta ? (
                  <Link
                    href={plan.cta.href}
                    className={cn(buttonVariants({ variant: plan.cta.variant, size: 'md' }), 'self-start')}
                  >
                    {plan.cta.label}
                  </Link>
                ) : (
                  <p className="text-[--color-text-muted]">{plan.ctaFallback}</p>
                )}

                <ul className="flex flex-col gap-3 border-t border-[--color-border] pt-6">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[--color-text-body]">
                      <Check aria-hidden="true" size={16} className="mt-1 shrink-0 text-[--color-text-primary]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="rounded-[--radius-md] bg-[--color-surface] px-6 py-4 text-[--color-text-body]">
            Self-service billing isn&apos;t available yet. To move to Team, talk to us and we&apos;ll switch your
            account. Your handoffs and share links stay exactly as they are.
          </p>

          <section aria-labelledby="pricing-questions" className="flex flex-col gap-4">
            <h2 id="pricing-questions" className="font-semibold text-[--color-text-primary]">
              Questions about plans
            </h2>
            <dl className="flex flex-col">
              {QUESTIONS.map((item) => (
                <div
                  key={item.question}
                  className="grid grid-cols-1 gap-2 border-t border-[--color-border] py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] md:gap-12"
                >
                  <dt className="font-medium text-[--color-text-primary]">{item.question}</dt>
                  <dd className="text-[--color-text-secondary]">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
