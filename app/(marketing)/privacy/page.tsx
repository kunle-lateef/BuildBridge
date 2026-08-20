import type { Metadata } from 'next';

import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';

export const metadata: Metadata = {
  title: 'Privacy Policy — BuildBridge',
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'What we collect',
    body: [
      'Account information: your name, email address, and a hashed password (we never store your password in plain text).',
      'Design assets you upload: the actual screen images/files you add to a handoff.',
      'Content you create: handoff names and descriptions, designer notes, and every confirm/modify/reject/override decision you make on an AI finding.',
      'Basic usage data: which handoffs you’ve created, when analyses run, and how many you’ve used against your plan’s monthly quota.',
    ],
  },
  {
    heading: 'Your designs are sent to Anthropic for analysis',
    body: [
      'This is the one disclosure we want to make sure you actually see, not bury in boilerplate: when you trigger analysis on a handoff, the screens you’ve uploaded are sent to Anthropic’s Claude API so it can detect components, extract specifications, and identify gaps. That’s the core mechanism the product is built on.',
      'Anthropic processes that content to generate the analysis result and returns it to BuildBridge — it is not used to identify you personally, and BuildBridge does not control or set Anthropic’s own data-handling policies beyond what’s specified in our agreement with them as a service provider.',
      'If you’d rather not send a particular screen for analysis, don’t upload it — analysis is something you trigger explicitly, not something that happens automatically on upload.',
    ],
  },
  {
    heading: 'Where your data lives',
    body: [
      'Uploaded design assets are stored in object storage (Cloudflare R2), never on the application server’s own filesystem. Files are never publicly accessible — every view uses a short-lived signed URL generated on demand.',
      'Structured data (accounts, handoffs, analysis results, decisions, notes) lives in a PostgreSQL database.',
    ],
  },
  {
    heading: 'Who can see your data',
    body: [
      'Only you can see a handoff’s designer review workspace — the raw AI findings, notes, and decision history.',
      'If you generate a share link, whoever holds that link can see the read-only developer view of that one handoff — confirmed specs and structured findings, never your designer workspace, never any other handoff, never your account details. You can revoke a share link at any time, which cuts off access immediately.',
      'We don’t sell your data, and we don’t share it with other users of the product.',
    ],
  },
  {
    heading: 'How long we keep it, and how to delete it',
    body: [
      'Your account and its data are retained for as long as your account exists.',
      'You can permanently delete any individual handoff from that handoff’s page, or delete your entire account from Settings. Both are real deletions — not a hidden flag — removing the underlying database records and uploaded files, not just hiding them from view. Account deletion cannot be undone.',
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'We use a single session cookie to keep you signed in. It’s httpOnly (not readable by page scripts) and marked secure in production. We don’t use third-party advertising or tracking cookies.',
    ],
  },
  {
    heading: 'Where this policy stands today',
    body: [
      'BuildBridge is an early-stage product. We don’t yet hold formal certifications like SOC 2 or ISO 27001, and we haven’t committed to a specific data-residency region. If either of those is a hard requirement for your organization, ask us directly before relying on this product for confidential work.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16">
          <div className="flex flex-col gap-3">
            <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
              Legal
            </span>
            <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
              Privacy Policy
            </h1>
            <p className="text-[--color-text-secondary]">
              Plain-language, not legal boilerplate. It describes what BuildBridge actually does with your
              data today.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {SECTIONS.map((section) => (
              <section key={section.heading} className="flex flex-col gap-2 border-t border-[--color-border] pt-6">
                <h2 className="font-semibold text-[--color-text-primary]">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[--color-text-secondary]">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
