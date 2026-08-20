'use client';

import { MapPin } from 'lucide-react';

import { useScreenPinActions } from '@/components/handoff/ScreenPinProvider';

type FindingPinLinkProps = {
  screenId: string;
  pinKey: `component:${string}`;
};

/**
 * Rendered only where a finding has a derivable region — no pinScreenId,
 * no link, no error state. See lib/screenPins.ts for why this always
 * targets the owning Component's pin, never a pin of the finding's own.
 */
export function FindingPinLink({ screenId, pinKey }: FindingPinLinkProps) {
  const { openScreenPin } = useScreenPinActions();

  return (
    <button
      type="button"
      onClick={() => openScreenPin({ screenId, highlightedKey: pinKey })}
      aria-label="Show on screen"
      title="Show on screen"
      className="inline-flex items-center justify-center rounded-[--radius-sm] p-1 text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
    >
      <MapPin aria-hidden="true" size={14} />
    </button>
  );
}
