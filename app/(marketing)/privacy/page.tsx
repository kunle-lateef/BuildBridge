import type { Metadata } from 'next';

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — BuildBridge',
};

// Text as in Figma `01 — Home` → "Privacy policy".
const SECTIONS: LegalSection[] = [
  {
    id: 'what-we-collect',
    heading: 'What we collect',
    body: [
      'Account information: your name, email address, and a hashed password (we never store your password in plain text).',
      'Design assets you upload: the actual screen images/files you add to a handoff.',
      'Content you create: handoff names and descriptions, designer notes, and every confirm/modify/reject decision you make on an AI finding.',
      'Basic usage data: which handoffs you’ve created, when analyses run, and how many you’ve used against your plan’s monthly quota.',
    ],
  },
  {
    id: 'anthropic',
    heading: 'Your designs are sent to Anthropic for analysis',
    isHighlighted: true,
    body: [
      'This is the most important part of this policy. When you trigger analysis on a handoff, the screens you’ve uploaded are sent to Anthropic’s Claude API so it can detect components, extract specifications, and identify gaps. That’s the core mechanism the product is built on.',
      'Anthropic processes that content to generate the analysis result and returns it to BuildBridge. It is not used to identify you personally, and BuildBridge does not control or set Anthropic’s own data-handling policies beyond what’s specified in our agreement with them as a service provider.',
      'If you’d rather not send a particular screen for analysis, don’t upload it. Analysis is something you trigger explicitly, not something that happens automatically on upload.',
    ],
  },
  {
    id: 'where-data-lives',
    heading: 'Where your data lives',
    body: [
      'Uploaded design assets are stored in object storage (Backblaze B2), never on the application server’s own filesystem. Files are never publicly accessible: every view uses a short-lived signed URL generated on demand.',
      'Structured data (accounts, handoffs, analysis results, decisions, notes) lives in a PostgreSQL database.',
    ],
  },
  {
    id: 'who-can-see',
    heading: 'Who can see your data',
    body: [
      'Only you can see a handoff’s designer review workspace: the raw AI findings, notes, and decision history.',
      'If you generate a share link, whoever holds that link can see the read-only developer view of that one handoff: decided specs, plus anything not decided yet, clearly marked, never your designer workspace, never any other handoff, never your account details. You can revoke a share link at any time, which cuts off access immediately.',
      'We don’t sell your data, and we don’t share it with other users of the product.',
    ],
  },
  {
    id: 'retention',
    heading: 'How long we keep it, and how to delete it',
    body: [
      'Your account and its data are retained for as long as your account exists.',
      'You can permanently delete any individual handoff from that handoff’s page, or delete your entire account from Settings. Both permanently remove the records and uploaded files. Account deletion cannot be undone.',
    ],
  },
  {
    id: 'cookies',
    heading: 'Cookies',
    body: [
      'We only use the cookies needed to keep you signed in securely. We don’t use advertising or tracking cookies.',
    ],
  },
  {
    id: 'today',
    heading: 'Where this policy stands today',
    body: [
      'BuildBridge is an early-stage product. We don’t yet hold formal certifications like SOC 2 or ISO 27001, and we haven’t committed to a specific data-residency region. If either of those is a hard requirement for your organization, ask us directly before relying on this product for confidential work.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description="What we collect, where it goes and how to delete it."
      sections={SECTIONS}
    />
  );
}
