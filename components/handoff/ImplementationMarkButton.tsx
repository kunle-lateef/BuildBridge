'use client';

import { useState } from 'react';

import { ImplementedIndicator } from '@/components/ui/ImplementedIndicator';
import type { FindingType } from '@/lib/types';

type ImplementationMarkButtonProps = {
  // Optional — the authenticated preview page (app/(dashboard)/handoffs/
  // [handoffId]/preview/page.tsx) reuses these same section components to
  // show "what a developer would see" without a live share link, per its
  // own "Preview only... not a live one" framing. With no share token
  // there's nowhere for a POST to resolve to, so the button renders inert
  // rather than being wired to a route that would always 404.
  shareToken?: string;
  findingType: Extract<FindingType, 'Component' | 'Specification' | 'ComponentState' | 'ResponsiveRule'>;
  findingReference: string;
  initialImplemented: boolean;
};

/**
 * An anonymous developer's own unverified claim, not a designer-reviewed
 * fact — deliberately NOT styled as a solid-fill pill like
 * ReviewStatusBadge's `Confirmed`/`Resolved` states, which signal
 * designer-verified ground truth. Uses the same "unfilled outline, plain
 * text" visual language DeveloperFlagPanel already established for
 * developer-submitted content, so it can never be mistaken for a
 * designer-authority badge at a glance.
 */
export function ImplementationMarkButton({
  shareToken,
  findingType,
  findingReference,
  initialImplemented,
}: ImplementationMarkButtonProps) {
  const [isImplemented, setIsImplemented] = useState(initialImplemented);
  const [isPending, setIsPending] = useState(false);

  async function handleMark() {
    setIsPending(true);
    try {
      const response = await fetch(`/api/share/${shareToken}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingType, findingReference }),
      });
      if (response.ok) {
        setIsImplemented(true);
      }
    } finally {
      setIsPending(false);
    }
  }

  if (isImplemented) {
    return <ImplementedIndicator />;
  }

  if (!shareToken) {
    return (
      <span className="self-start text-left text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-muted]">
        Mark as implemented (available on a live share link)
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => void handleMark()}
      className="self-start text-left text-[length:var(--font-desktop-caption-medium-size)] text-[--color-primary] underline hover:no-underline disabled:opacity-50"
    >
      {isPending ? 'Marking…' : 'Mark as implemented'}
    </button>
  );
}
