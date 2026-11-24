'use client';

import { useEffect, useRef, useState } from 'react';

import { ScreenPinOverlay } from '@/components/handoff/ScreenPinOverlay';
import { Minus, Plus } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { ScreenPin } from '@/lib/screenPins';

type CanvasScreen = { id: string; name: string; imageUrl: string; pins: ScreenPin[] };

const PIN_KEY: { label: string; className: string }[] = [
  { label: 'Detected', className: 'border-solid border-[--color-detected]' },
  { label: 'Inferred', className: 'border-dashed border-[--color-inferred]' },
  { label: 'Suggested', className: 'border-dotted border-[--color-ai-suggested]' },
  { label: 'Gap', className: 'border-solid border-[--color-error]' },
];

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];
const STAGE_HEIGHT = 560;
const SWIPE_DISTANCE = 40;

/**
 * The Review tab's canvas (Figma `04 — Handoff`): screen switcher with the
 * pin key and zoom, and the current screen with its finding pins on a flat
 * surface. Pins come from lib/screenPins.ts, as before.
 */
export function ReviewCanvas({
  screens,
  focus,
}: {
  screens: CanvasScreen[];
  /** Guided review: the pin to spotlight (null = none). Undefined outside guided review. */
  focus?: { screenId: string; key: string } | null;
}) {
  const [index, setIndex] = useState(0);

  // Follow the finding being reviewed onto its screen.
  useEffect(() => {
    if (!focus) return;
    const target = screens.findIndex((candidate) => candidate.id === focus.screenId);
    if (target >= 0) setIndex(target);
  }, [focus, screens]);
  const [zoomIndex, setZoomIndex] = useState(ZOOM_STEPS.indexOf(1));
  const touchStartX = useRef<number | null>(null);
  const screen = screens[index];
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  if (!screen) {
    return (
      <div className="grid h-[600px] place-items-center rounded-[12px] bg-[--color-surface] text-[14px] text-[--color-text-secondary]">
        No screens yet. Add them in the Screens tab.
      </div>
    );
  }

  const stepButton = 'grid h-6 w-6 place-items-center rounded-[6px] border border-[--color-border] bg-white text-[--color-text-secondary] disabled:opacity-40';

  // Phones and tablets swipe between screens (Figma "Review — … · Mobile 390").
  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < SWIPE_DISTANCE) return;
    setIndex((value) => (end < start ? Math.min(screens.length - 1, value + 1) : Math.max(0, value - 1)));
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 max-lg:gap-0">
      <div className="hidden flex-wrap items-center gap-3 lg:flex">
        <button
          type="button"
          aria-label="Previous screen"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          className={stepButton}
        >
          ‹
        </button>
        <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">{screen.name}</span>
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">
          {index + 1} of {screens.length}
        </span>
        <button
          type="button"
          aria-label="Next screen"
          disabled={index === screens.length - 1}
          onClick={() => setIndex((value) => Math.min(screens.length - 1, value + 1))}
          className={stepButton}
        >
          ›
        </button>
        <span className="flex-1" />
        <span className="hidden items-center gap-3 md:flex">
          {PIN_KEY.map((key) => (
            <span key={key.label} className="flex items-center gap-1.5 text-[12px] leading-4 text-[--color-text-secondary]">
              <span aria-hidden="true" className={cn('h-2 w-2 rounded-full border-[1.5px]', key.className)} />
              {key.label}
            </span>
          ))}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] leading-4 text-[--color-text-secondary]">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
            className={stepButton}
          >
            <Minus size={12} />
          </button>
          <button type="button" onClick={() => setZoomIndex(ZOOM_STEPS.indexOf(1))} className="px-1 hover:text-[--color-text-primary]">
            {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() => setZoomIndex((value) => Math.min(ZOOM_STEPS.length - 1, value + 1))}
            className={stepButton}
          >
            <Plus size={12} />
          </button>
        </span>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="h-[400px] overflow-auto rounded-[12px] bg-[--color-surface] p-4 lg:h-[var(--stage-box)] lg:p-10"
        style={{ '--stage-box': `${STAGE_HEIGHT + 80}px`, '--stage': `${STAGE_HEIGHT * zoom}px` } as React.CSSProperties}
      >
        <div className="mx-auto h-full w-full lg:h-[var(--stage)]">
          <ScreenPinOverlay
            key={screen.id}
            screenId={screen.id}
            name={screen.name}
            imageUrl={screen.imageUrl}
            pins={screen.pins}
            focusKey={focus === undefined ? undefined : focus && focus.screenId === screen.id ? focus.key : null}
          />
        </div>
      </div>
      {/* Figma shows the label alone; ‹ › stay so switching never depends on a swipe. */}
      <div className="flex items-center justify-center gap-2 pt-2 lg:hidden">
        {screens.length > 1 && (
          <button
            type="button"
            aria-label="Previous screen"
            disabled={index === 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            className={stepButton}
          >
            ‹
          </button>
        )}
        <p className="m-0 flex items-center gap-2" aria-live="polite">
          <span className="text-[14px] font-medium leading-5 tracking-[0.1px] text-[--color-text-primary]">{screen.name}</span>
          <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
            {index + 1} of {screens.length}
            {screens.length > 1 && ' · swipe for more'}
          </span>
        </p>
        {screens.length > 1 && (
          <button
            type="button"
            aria-label="Next screen"
            disabled={index === screens.length - 1}
            onClick={() => setIndex((value) => Math.min(screens.length - 1, value + 1))}
            className={stepButton}
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
