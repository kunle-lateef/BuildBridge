'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { useScreenPinRequestFor } from '@/components/handoff/ScreenPinProvider';
import { useContainedImageRect } from '@/components/handoff/useContainedImageRect';
import { Card } from '@/components/ui/Card';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { cn } from '@/lib/cn';
import { regionToPinPercent } from '@/lib/geometry';
import type { ScreenPin } from '@/lib/screenPins';
import type { ProvenanceType } from '@/lib/types';

type ScreenPinOverlayProps = {
  screenId: string;
  name: string;
  imageUrl: string;
  pins: ScreenPin[];
};

// The same tokens ProvenanceBadge composes (design-system.md's Color
// semantics table) — reused here, never invented, because a circular
// numbered map pin can't literally BE a ProvenanceBadge pill. This is the
// one exception to "always compose ProvenanceBadge" component-builder/
// SKILL.md calls for: the real ProvenanceBadge still renders for every
// nested finding inside the pin's panel below, so provenance is never
// communicated by this dot's color alone.
const PROVENANCE_VAR: Record<ProvenanceType, string> = {
  Detected: '--color-detected',
  Inferred: '--color-inferred',
  Suggested: '--color-ai-suggested',
};

const PROVENANCE_ARIA: Record<ProvenanceType, string> = {
  Detected: 'Detected directly from the design',
  Inferred: 'Inferred from visual evidence, not certain',
  Suggested: 'AI suggestion, not a confirmed observation',
};

/**
 * The Modal's `object-contain` image body, with one numbered pin per
 * ScreenPin overlaid at its region's position. Deliberately not used for the
 * small grid thumbnail — that tile crops with `object-cover`, so accurate
 * pin placement isn't achievable there for any screen whose aspect ratio
 * isn't the tile's fixed 16:9.
 */
export function ScreenPinOverlay({ screenId, name, imageUrl, pins }: ScreenPinOverlayProps) {
  const { containerRef, handleImageLoad, containedRect, naturalSize } = useContainedImageRect();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [clickedKey, setClickedKey] = useState<string | null>(null);
  const request = useScreenPinRequestFor(screenId);

  useEffect(() => {
    if (request) {
      setClickedKey(request.highlightedKey);
    }
    // Only re-run when a *new* request for this screen arrives, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.requestId]);

  const activeKey = hoveredKey ?? clickedKey;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Image src={imageUrl} alt={`${name} screen, full size`} fill sizes="90vw" className="object-contain" onLoad={handleImageLoad} />

      {containedRect && naturalSize && pins.length > 0 && (
        <div className="absolute inset-0">
          {pins.map((pin) => {
            const { leftPercent, topPercent } = regionToPinPercent({
              region: pin.region,
              naturalWidth: naturalSize.width,
              naturalHeight: naturalSize.height,
              containedRect,
            });
            const isActive = activeKey === pin.key;
            const colorVar = `var(${PROVENANCE_VAR[pin.provenance]})`;
            const panelOnLeft = leftPercent > 50;

            return (
              <div
                key={pin.key}
                className="absolute"
                style={{ left: `${leftPercent}%`, top: `${topPercent}%`, transform: 'translate(-50%, -50%)' }}
              >
                <button
                  type="button"
                  aria-label={`${pin.findings[0]?.label ?? 'Component'} — ${PROVENANCE_ARIA[pin.provenance]}, ${pin.findings.length} finding${pin.findings.length === 1 ? '' : 's'}`}
                  onMouseEnter={() => setHoveredKey(pin.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(pin.key)}
                  onBlur={() => setHoveredKey(null)}
                  onClick={() => setClickedKey((prev) => (prev === pin.key ? null : pin.key))}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[length:var(--font-desktop-caption-bold-size)] font-bold text-white shadow transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                    isActive ? 'scale-125' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: colorVar }}
                >
                  {pin.number}
                </button>

                {isActive && (
                  <Card
                    floating
                    className={cn(
                      'absolute top-1/2 z-10 flex w-64 -translate-y-1/2 flex-col gap-2 p-3',
                      panelOnLeft ? 'right-full mr-3' : 'left-full ml-3',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[--color-text-primary]">{pin.findings[0]?.label}</span>
                      <ProvenanceBadge provenance={pin.provenance} />
                    </div>
                    {pin.findings.length > 1 && (
                      <div className="flex flex-col gap-1.5">
                        {pin.findings.slice(1).map((finding) => (
                          <div key={`${finding.findingType}-${finding.findingId}`} className="flex items-center gap-1.5">
                            <ProvenanceBadge provenance={finding.provenance} />
                            <span className="text-[--color-text-secondary]">{finding.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
