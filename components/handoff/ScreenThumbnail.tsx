'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { ScreenPinOverlay } from '@/components/handoff/ScreenPinOverlay';
import { useScreenPinRequestFor } from '@/components/handoff/ScreenPinProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import type { ScreenPin } from '@/lib/screenPins';
import type { ScreenAnalysisStatus } from '@/lib/types';

type ScreenThumbnailProps = {
  name: string;
  imageUrl: string;
  analysisStatus: ScreenAnalysisStatus;
  /** 1-based position in the order developers see the screens. */
  order: number;
  /** "2 components · 0 gaps". */
  meta: string;
  screenId?: string;
  pins?: ScreenPin[];
  className?: string;
};

const STATUS_NOTE: Partial<Record<ScreenAnalysisStatus, string>> = {
  Pending: 'Not analyzed yet',
  Analyzing: 'Analyzing…',
  Failed: 'Analysis failed',
};

/**
 * One card on the Screens tab (Figma `04 — Handoff / Screens tab`): the
 * screen on a grey stage, its position and name, then what was found on it.
 * `imageUrl` is a short-lived signed GET URL (lib/storage.ts); design assets
 * are never served from a public bucket. Clicking opens the full-size view
 * with pins, which is also where a pin link from a finding lands.
 */
export function ScreenThumbnail({ name, imageUrl, analysisStatus, order, meta, screenId, pins = [], className }: ScreenThumbnailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pinRequest = useScreenPinRequestFor(screenId ?? '');

  useEffect(() => {
    if (pinRequest) {
      setIsExpanded(true);
    }
    // Re-open on every new request for this screen, keyed off requestId —
    // not screenId/highlightedKey, which can be unchanged between clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinRequest?.requestId]);

  const note = STATUS_NOTE[analysisStatus];

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-[12px] border border-[--color-border] bg-white', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        aria-label={`View ${name} full size`}
        className="relative h-[180px] bg-[--color-surface] transition hover:brightness-[0.98]"
      >
        <Image src={imageUrl} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-contain p-6" />
      </button>
      <div className="flex flex-col gap-1 px-4 py-3">
        <span className="flex items-baseline gap-1.5 text-[14px] leading-5 text-[--color-text-primary]">
          <span className="text-[12px] text-[--color-text-secondary]">{order}.</span>
          {name}
        </span>
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">{note ?? meta}</span>
      </div>

      <Modal open={isExpanded} onClose={() => setIsExpanded(false)} title={name} className="max-w-4xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-[8px] bg-[--color-surface]">
          {screenId ? (
            <ScreenPinOverlay screenId={screenId} name={name} imageUrl={imageUrl} pins={pins} />
          ) : (
            <Image src={imageUrl} alt={`${name} screen, full size`} fill sizes="90vw" className="object-contain" />
          )}
        </div>
        <Button type="button" variant="secondary" onClick={() => setIsExpanded(false)} className="self-end">
          Close
        </Button>
      </Modal>
    </div>
  );
}
