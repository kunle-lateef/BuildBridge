'use client';

import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

import { computeContainedRect, type ContainedRect } from '@/lib/geometry';

/**
 * Tracks the actual rendered position/size of an `object-contain` image
 * inside a responsive container, so pins can be placed against it exactly.
 * Sourced from the loaded image's own `naturalWidth`/`naturalHeight` (via
 * `onLoad`) rather than any DB-stored dimensions — `Screen.dimensions` is
 * optional JSON that can legitimately be null or stale, and trusting it
 * would risk silently misplaced pins with no error. A ResizeObserver keeps
 * the rect current across window/modal resizes.
 */
export function useContainedImageRect(): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  containedRect: ContainedRect | null;
  naturalSize: { width: number; height: number } | null;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
  }

  const containedRect =
    containerSize && naturalSize
      ? computeContainedRect({
          containerWidth: containerSize.width,
          containerHeight: containerSize.height,
          naturalWidth: naturalSize.width,
          naturalHeight: naturalSize.height,
        })
      : null;

  return { containerRef, handleImageLoad, containedRect, naturalSize };
}
