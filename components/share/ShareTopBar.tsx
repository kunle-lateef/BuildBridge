'use client';

import Link from 'next/link';
import { useState } from 'react';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Copy, Download, Lock } from '@/components/ui/icons';

/**
 * The share view's top bar (Figma `05 — Share view`): logo, handoff name,
 * "Read-only", and the developer's three tools. "Copy as checklist" copies
 * only decided values, as a Markdown task list.
 */
export function ShareTopBar({ shareToken, name, checklist, downloadHref, isExample = false }: {
  shareToken?: string; name: string; checklist: string; downloadHref: string;
  /** The public /example page: "Example" pill and "Start a handoff" instead of "Flag something". */
  isExample?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyChecklist() {
    try {
      await navigator.clipboard.writeText(checklist);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the Markdown download has the same values.
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[--color-border] bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-4 px-5 lg:px-8">
        <Link href="/" className="shrink-0">
          <BrandMark alt="BuildBridge" size={24} />
        </Link>
        <span className="min-w-0 truncate text-[14px] font-medium leading-5 text-[--color-text-primary]">{name}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] bg-[--color-surface] px-2 py-0.5 text-[12px] font-medium leading-4 text-[--color-text-secondary]">
          {!isExample && <Lock aria-hidden="true" size={12} />}
          {isExample ? 'Example' : 'Read-only'}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => void copyChecklist()}
          className="hidden items-center gap-1.5 text-[14px] leading-5 text-[--color-primary] underline sm:flex"
        >
          <Copy aria-hidden="true" size={14} />
          {copied ? 'Copied' : 'Copy as checklist'}
        </button>
        <a
          href={downloadHref}
          className="hidden items-center gap-1.5 text-[14px] leading-5 text-[--color-primary] underline sm:flex"
        >
          <Download aria-hidden="true" size={14} />
          Download as Markdown
        </a>
        {isExample && (
          <Link href="/sign-up" className={buttonVariants({ variant: 'primary' })}>
            Start a handoff
          </Link>
        )}
        {shareToken && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => document.getElementById('flag')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            Flag something
          </Button>
        )}
      </div>
    </header>
  );
}
