import type { Metadata } from 'next';

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service — BuildBridge',
};

// Text as in Figma `01 — Home` → "Terms of service".
const SECTIONS: LegalSection[] = [
  {
    id: 'what-buildbridge-is',
    heading: 'What BuildBridge is',
    body: [
      'BuildBridge is an interpretation layer that sits between a finished design and the start of development: you upload design screens, BuildBridge analyzes them and flags gaps, you review and confirm the results, and a developer sees a structured, read-only handoff. It is not a design tool, not a code generator, and not a project-management suite.',
    ],
  },
  {
    id: 'your-account',
    heading: 'Your account',
    body: [
      'You’re responsible for keeping your login credentials secure and for activity that happens under your account. Tell us if you believe your account has been compromised.',
      'You must be able to lawfully use the designs you upload. Don’t upload material you don’t have the rights to share or process.',
    ],
  },
  {
    id: 'ai-findings',
    heading: 'AI-generated findings are assistance, not certainty',
    isHighlighted: true,
    body: [
      'Every finding BuildBridge produces is labeled Detected, Inferred, or Suggested, reflecting how confident the underlying evidence actually is. None of it is presented as an infallible fact. You, the designer, are responsible for reviewing and confirming findings before relying on them or sharing them with a developer. BuildBridge does its best to interpret your designs accurately, but it can be wrong, and the review step exists specifically because of that.',
    ],
  },
  {
    id: 'acceptable-use',
    heading: 'Acceptable use',
    body: [
      'Don’t use BuildBridge to process content you don’t have the right to, don’t attempt to access another account’s data, don’t abuse the service (including excessive automated requests beyond your plan’s quota), and don’t attempt to extract, reverse-engineer, or misuse the underlying AI models or system prompts.',
    ],
  },
  {
    id: 'plans',
    heading: 'Plans and usage',
    body: [
      'BuildBridge’s plans are usage-based, tied to how many analyses you run per month, not per-seat. Your current usage against your plan’s quota is always visible in your dashboard, so it’s never a hidden limit you only discover by hitting it.',
      'Self-service billing and plan upgrades are not yet available; if you need a different plan, contact us directly.',
    ],
  },
  {
    id: 'your-data',
    heading: 'Your data, your control',
    body: [
      'You can delete any individual handoff, or your entire account, at any time. Both are permanent, real deletions, described in full in our Privacy Policy.',
    ],
  },
  {
    id: 'as-is',
    heading: 'Service “as is”',
    body: [
      'BuildBridge is provided as-is, without warranty of any kind, during this early stage of the product. We don’t guarantee uninterrupted availability, and AI analysis latency depends in part on a third-party provider (Anthropic) outside our direct control. To the extent permitted by law, BuildBridge isn’t liable for indirect or consequential damages arising from use of the service.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to these terms',
    body: [
      'We may update these terms as the product evolves. If we make a material change, we’ll make a reasonable effort to let you know before it takes effect.',
    ],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of service" description="The rules for using BuildBridge." sections={SECTIONS} />;
}
