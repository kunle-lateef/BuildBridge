import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';


import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'BuildBridge',
  description: 'AI-powered designer-to-developer handoff assistant.',
};

const WORKFLOW_STEPS = ['Upload', 'Analyze', 'Detect gaps', 'Review', 'Resolve', 'Ready', 'Handoff'];

export default async function MarketingHomePage() {
  const session = await auth();

  if (session?.user) {
    redirect('/handoffs');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <Image src="/logo/buildbridge-logo.svg" alt="BuildBridge" width={40} height={40} />

      <div className="flex flex-col gap-4">
        <h1 className="text-[length:var(--font-desktop-display-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Handoffs a developer can actually trust.
        </h1>
        <p className="text-[--color-text-secondary]">
          BuildBridge reads a finished design and tells you what it detected, what it inferred, and
          what it&apos;s only suggesting — so a designer can confirm the gaps before a developer ever
          sees them.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/sign-up"
          className="rounded-[--radius-md] bg-[--gradient-primary] px-5 py-2.5 font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          Create account
        </Link>
        <Link
          href="/sign-in"
          className="rounded-[--radius-md] border border-[--color-border] px-5 py-2.5 text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          Sign in
        </Link>
      </div>

      <ol className="flex flex-wrap items-center justify-center gap-2 text-[--color-text-muted]">
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span>{step}</span>
            {index < WORKFLOW_STEPS.length - 1 && <span aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
    </main>
  );
}
