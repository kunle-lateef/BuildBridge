import Link from 'next/link';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/ui/BrandMark';

/**
 * The shell for Figma `11 — System` pages (404, error): logo top-left, a
 * small uppercase eyebrow, the heading, one line of explanation, actions.
 */
export function SystemPage({ eyebrow, title, body, actions }: {
  eyebrow: string; title: string; body: string; actions: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="px-5 py-6 sm:px-10">
        <Link href="/" className="inline-flex">
          <BrandMark alt="BuildBridge" size={28} />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 pb-24 text-center">
        <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.12em] text-[--color-text-secondary]">{eyebrow}</span>
        <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">{title}</h1>
        <p className="m-0 max-w-[480px] text-[16px] leading-6 text-[--color-text-secondary]">{body}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div>
      </main>
    </div>
  );
}
