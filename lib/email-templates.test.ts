import { describe, expect, it } from 'vitest';

import {
  analysisEmail,
  continueReviewEmail,
  developerFlagEmail,
  escapeHtml,
  implementationMarkedEmail,
  passwordResetEmail,
} from './email-templates';

const APP = 'https://app.example.test';
const base = {
  appUrl: APP,
  handoffName: 'Ledger · Checkout v3',
  handoffUrl: `${APP}/handoffs/h1`,
  screens: 4,
  components: 14,
  openGaps: 6,
  openCritical: 1,
  stagesFinished: 5,
  readinessScore: 78,
  isReady: false,
};

describe('continue-review email (phone triage "Email me a link")', () => {
  it('says how many values are left, links to the review and has no notifications footer', () => {
    const email = continueReviewEmail({ appUrl: APP, handoffName: 'Ledger · Checkout v3', valuesLeft: 26, reviewUrl: `${APP}/handoffs/h1` });
    expect(email.subject).toBe('Finish reviewing: Ledger · Checkout v3');
    expect(email.preview).toBe('26 values left to review.');
    expect(email.text).toContain('Open the review: https://app.example.test/handoffs/h1');
    expect(email.html).not.toContain('Turn off emails');
  });

  it('escapes the handoff name in the HTML', () => {
    const email = continueReviewEmail({ appUrl: APP, handoffName: '<b>x</b>', valuesLeft: 1, reviewUrl: `${APP}/handoffs/h1` });
    expect(email.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(email.text).toContain('1 value in <b>x</b>');
  });
});

describe('email templates (Figma 12 — Emails)', () => {
  it('analysis finished: subject, preview and summary rows', () => {
    const email = analysisEmail({ ...base, outcome: 'Completed' });
    expect(email.subject).toBe('Analysis finished: Ledger · Checkout v3');
    expect(email.preview).toBe('14 components and 6 gaps found. 1 is critical.');
    expect(email.text).toContain('Gaps: 6 · 1 critical');
    expect(email.text).toContain('Readiness: 78% · Not ready');
    expect(email.html).toContain('Review findings');
  });

  it('analysis partly finished and failed use their own subject, body and button', () => {
    const partial = analysisEmail({ ...base, outcome: 'PartiallyCompleted', stagesFinished: 3, readinessScore: null });
    expect(partial.subject).toBe('Analysis partly finished: Ledger · Checkout v3');
    expect(partial.text).toContain('3 of 5 stages finished. Check responsive behavior and gaps by hand.');
    expect(partial.html).toContain('Review what was found');

    const failed = analysisEmail({ ...base, outcome: 'Failed' });
    expect(failed.subject).toBe('Analysis didn’t finish: Ledger · Checkout v3');
    expect(failed.text).toContain('None of the stages finished. Your screens are saved.');
    expect(failed.html).toContain('Try again');
  });

  it('never shows a readiness score the app is hiding', () => {
    const email = analysisEmail({ ...base, outcome: 'Completed', readinessScore: null });
    expect(email.text).not.toContain('Readiness:');
  });

  it('escapes everything a user wrote before it reaches the HTML', () => {
    const email = developerFlagEmail({
      appUrl: APP,
      handoffName: '<script>alert(1)</script>',
      kind: 'Mismatch',
      target: 'Pay button · Hover',
      message: '"><img src=x onerror=alert(1)>',
      feedbackUrl: `${APP}/handoffs/h1?tab=feedback#flag-f1`,
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.subject).toBe('A developer flagged a mismatch: <script>alert(1)</script>');
  });

  it('developer flag, implemented and reset copy match Figma', () => {
    const flag = developerFlagEmail({ appUrl: APP, handoffName: 'Ledger · Checkout v3', kind: 'Mismatch', target: 'Pay button · Hover', message: 'Hi', feedbackUrl: 'x' });
    expect(flag.preview).toBe('On Pay button · Hover');
    expect(flag.text).toContain('On Pay button · Hover in Ledger · Checkout v3:');

    const marked = implementationMarkedEmail({ appUrl: APP, handoffName: 'Ledger · Checkout v3', finding: 'Pay button corner radius (8px)', handoffUrl: 'x' });
    expect(marked.subject).toBe('Marked implemented: Pay button corner radius (8px)');
    expect(marked.text).toContain('Pay button corner radius (8px) in Ledger · Checkout v3 is now marked implemented on the share link.');

    const reset = passwordResetEmail({ appUrl: APP, email: 'someone@example.test', resetUrl: `${APP}/reset-password?token=t` });
    expect(reset.preview).toBe('The link works for 1 hour.');
    expect(reset.html).not.toContain('Turn off emails');
  });

  it('notification emails link to the notification settings', () => {
    expect(analysisEmail({ ...base, outcome: 'Completed' }).html).toContain(`${APP}/settings?tab=notifications`);
  });

  it('escapeHtml covers quotes too, for attribute values', () => {
    expect(escapeHtml(`"'<>&`)).toBe('&quot;&#39;&lt;&gt;&amp;');
  });
});
