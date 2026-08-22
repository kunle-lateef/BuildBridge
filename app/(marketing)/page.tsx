import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Gauge,
  MessageSquare,
  Plus,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HeroBackground } from '@/components/marketing/HeroBackground';
import { HeroGridLens } from '@/components/marketing/HeroGridLens';
import { HeroIntro } from '@/components/marketing/HeroIntro';
import { HowItWorksInteractive } from '@/components/marketing/HowItWorksInteractive';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { buttonVariants } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

export const metadata: Metadata = {
  title: 'BuildBridge',
  description: 'AI-powered designer-to-developer handoff assistant.',
};

const WORKFLOW_STEPS: { title: string; description: string }[] = [
  { title: 'Upload', description: 'Drop in your finished screens — PNG, JPG, or WebP, any number at once.' },
  {
    title: 'Analyze',
    description: 'Claude reads every screen and extracts components, specs, states, and responsive behavior.',
  },
  {
    title: 'Detect gaps',
    description: 'Missing states, unclear responsive behavior, and incomplete specs are flagged automatically.',
  },
  {
    title: 'Review',
    description: 'Confirm, modify, reject, or override every AI finding — nothing ships without your say.',
  },
  {
    title: 'Resolve',
    description:
      'Work through flagged issues until your readiness score clears — it only reflects what’s actually confirmed, never a false green light.',
  },
  {
    title: 'Handoff',
    description: 'Share a read-only link. Developers see confirmed specs, not raw AI guesses.',
  },
];

const AUDIENCE_SECTIONS: {
  title: string;
  note?: string;
  items: { icon: LucideIcon; title: string; description: string }[];
}[] = [
  {
    title: 'For Designers',
    items: [
      {
        icon: AlertCircle,
        title: 'See exactly what needs your attention',
        description: 'AI flags gaps automatically, so you’re not guessing what’s missing.',
      },
      {
        icon: CheckCircle2,
        title: 'Confirm, don’t just approve',
        description: 'Every finding needs your explicit confirm/modify/reject before a developer ever sees it.',
      },
      {
        icon: MessageSquare,
        title: 'Notes that travel with the handoff',
        description: 'Add context once; it shows up wherever a developer looks.',
      },
    ],
  },
  {
    title: 'For Developers',
    note: 'No account needed — just the link',
    items: [
      {
        icon: FileText,
        title: 'No more Slack archaeology',
        description: 'Every spec, state, and edge case in one read-only view, not scattered across threads.',
      },
      {
        icon: ShieldCheck,
        title: 'Know what’s real vs. guessed',
        description: 'Detected, Inferred, and Suggested are never blended together.',
      },
      {
        icon: Gauge,
        title: 'A readiness score that means something',
        description: 'If it says ready, every Critical issue is actually resolved.',
      },
    ],
  },
];

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What happens if my design doesn’t show every state?',
    answer:
      'BuildBridge marks what it can’t confirm as Suggested, or flags it as a gap — it never invents a hover state or breakpoint behavior it didn’t see.',
  },
  {
    question: 'How many handoffs can I analyze?',
    answer: 'Each plan has a monthly analysis quota; re-analyzing an unchanged screen doesn’t count against it.',
  },
  {
    question: 'Can a developer edit anything on the shared link?',
    answer: 'No — it’s read-only. Only the designer can confirm, modify, or resolve findings.',
  },
  {
    question: 'What if I disagree with an AI finding?',
    answer: 'Reject or override it. Your decision is never silently overwritten by a later re-analysis.',
  },
  {
    question: 'Can I revoke a shared link?',
    answer: 'Yes, any time from the handoff page — it stops working immediately.',
  },
];

const PROVENANCE_COPY: {
  type: ProvenanceType;
  property: string;
  value: string;
  description: string;
  borderStyle: string;
}[] = [
  {
    type: 'Detected',
    property: 'Corner radius',
    value: '8px',
    description: 'Read directly from the design.',
    borderStyle: 'border-solid',
  },
  {
    type: 'Inferred',
    property: 'Hover state',
    value: 'Darkens 8%',
    description: 'Reasoned from visual evidence, not explicitly shown.',
    borderStyle: 'border-dashed',
  },
  {
    type: 'Suggested',
    property: 'Loading state',
    value: 'Spinner, centered',
    description: 'The AI’s best guess where evidence runs out.',
    borderStyle: 'border-dotted',
  },
];

export default async function MarketingHomePage() {
  const session = await auth();

  if (session?.user) {
    redirect('/handoffs');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex flex-1 flex-col">
        <section className="relative isolate overflow-hidden">
          <HeroGridLens />
          <HeroIntro />
        </section>

        <section id="who-its-for" className="scroll-mt-20 border-t border-[--color-border]">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-20">
            <div className="flex flex-col gap-3">
              <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
                Who it&apos;s for
              </span>
              <h2 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
                Built for both sides of the handoff
              </h2>
            </div>
            {AUDIENCE_SECTIONS.map((audience) => (
              <div
                key={audience.title}
                className="flex flex-col gap-6 rounded-[--radius-lg] bg-[--color-surface] px-4 py-8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold text-[--color-text-primary]">{audience.title}</h3>
                  {audience.note && (
                    <span className="inline-flex items-center gap-1.5 rounded-[--radius-full] bg-[--color-success-light] px-3 py-1 text-[--color-success]">
                      <CheckCircle2 aria-hidden="true" size={14} />
                      {audience.note}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {audience.items.map((item) => (
                    <Card key={item.title} className="flex flex-col gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-[--color-primary-light] text-[--color-primary]">
                        <item.icon aria-hidden="true" size={20} />
                      </span>
                      <span className="font-medium text-[--color-text-primary]">{item.title}</span>
                      <p className="text-[--color-text-secondary]">{item.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-t border-[--color-border]">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-4 py-20 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            <HowItWorksInteractive steps={WORKFLOW_STEPS} />
          </div>
        </section>

        <section id="trust" className="scroll-mt-20 bg-[--color-surface]">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-20">
            <div className="flex flex-col gap-3">
              <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
                Why trust BuildBridge
              </span>
              <h2 className="max-w-2xl text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
                Every finding shows its own confidence
              </h2>
              <p className="max-w-2xl text-[--color-text-secondary]">
                AI reads the design once, and it isn&apos;t always certain — BuildBridge never pretends
                otherwise. Every component, spec, and state carries one of three labels, visible everywhere,
                never buried in a tooltip.
              </p>
              <p className="text-[--color-text-muted]">
                All three, from the same component — the{' '}
                <span className="font-medium text-[--color-text-primary]">Primary Button</span> above.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PROVENANCE_COPY.map(({ type, property, value, description, borderStyle }) => (
                <Card key={type} className={cn('flex flex-col gap-4 border-2', borderStyle)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[--color-text-secondary]">{property}</span>
                    <ProvenanceBadge provenance={type} />
                  </div>
                  <span className="font-mono text-[--color-text-primary]">{value}</span>
                  <p className="border-t border-[--color-border] pt-4 text-[--color-text-secondary]">
                    {description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-[--color-border]">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-4 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
                FAQ
              </span>
              <h2 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
                Frequently asked questions
              </h2>
              <p className="max-w-sm text-[--color-text-secondary]">
                Answers to the most common questions about how BuildBridge handles gaps, review, quotas, and
                sharing.
              </p>
            </div>
            <div className="flex flex-col">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group border-b border-[--color-border] py-5 first:border-t">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[--color-text-primary]">
                    {item.question}
                    <Plus
                      aria-hidden="true"
                      size={18}
                      className="shrink-0 text-[--color-text-muted] transition-transform group-open:rotate-45"
                    />
                  </summary>
                  <p className="mt-3 text-[--color-text-secondary]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[--color-primary-dark]">
          <HeroBackground tone="inverse" />
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center">
            <h2 className="max-w-2xl text-[length:var(--font-mobile-display-semi-bold-size)] font-semibold leading-tight text-white sm:text-[length:var(--font-tablet-display-semi-bold-size)] lg:text-[length:var(--font-desktop-display-semi-bold-size)]">
              Give developers a handoff they don&apos;t have to double-check.
            </h2>
            <Link href="/sign-up" className={buttonVariants({ variant: 'inverse', size: 'lg' })}>
              Get started
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
