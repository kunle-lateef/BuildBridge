import { describe, expect, it } from 'vitest';

import { computeContainedRect, isValidRegion, regionToPinPercent } from './geometry';

describe('isValidRegion', () => {
  it('accepts a well-formed region', () => {
    expect(isValidRegion({ x: 10, y: 20, width: 100, height: 50 })).toBe(true);
  });

  it('rejects null, non-objects, and missing/zero dimensions', () => {
    expect(isValidRegion(null)).toBe(false);
    expect(isValidRegion(undefined)).toBe(false);
    expect(isValidRegion('region')).toBe(false);
    expect(isValidRegion({ x: 10, y: 20 })).toBe(false);
    expect(isValidRegion({ x: 10, y: 20, width: 0, height: 50 })).toBe(false);
    expect(isValidRegion({ x: 10, y: 20, width: 100, height: -5 })).toBe(false);
  });
});

describe('computeContainedRect', () => {
  it('returns a zero-offset rect when the aspect ratios exactly match', () => {
    const rect = computeContainedRect({
      containerWidth: 800,
      containerHeight: 600,
      naturalWidth: 1600,
      naturalHeight: 1200,
    });

    expect(rect).toEqual({ offsetX: 0, offsetY: 0, width: 800, height: 600 });
  });

  it('pillarboxes (adds horizontal offset) for a portrait image in a wider container', () => {
    // A 9:16 mobile screenshot inside a 16:9 container.
    const rect = computeContainedRect({
      containerWidth: 1600,
      containerHeight: 900,
      naturalWidth: 900,
      naturalHeight: 1600,
    });

    // scale = min(1600/900, 900/1600) = min(1.778, 0.5625) = 0.5625
    expect(rect?.height).toBe(900);
    expect(rect?.width).toBeCloseTo(506.25, 2);
    expect(rect?.offsetY).toBe(0);
    expect(rect?.offsetX).toBeCloseTo((1600 - 506.25) / 2, 2);
  });

  it('letterboxes (adds vertical offset) for a wide image in a taller container', () => {
    const rect = computeContainedRect({
      containerWidth: 900,
      containerHeight: 1600,
      naturalWidth: 1600,
      naturalHeight: 900,
    });

    expect(rect?.width).toBe(900);
    expect(rect?.height).toBeCloseTo(506.25, 2);
    expect(rect?.offsetX).toBe(0);
    expect(rect?.offsetY).toBeCloseTo((1600 - 506.25) / 2, 2);
  });

  it('returns null for zero or negative container/image dimensions rather than NaN', () => {
    expect(computeContainedRect({ containerWidth: 0, containerHeight: 600, naturalWidth: 100, naturalHeight: 100 })).toBeNull();
    expect(computeContainedRect({ containerWidth: 800, containerHeight: 0, naturalWidth: 100, naturalHeight: 100 })).toBeNull();
    expect(computeContainedRect({ containerWidth: 800, containerHeight: 600, naturalWidth: 0, naturalHeight: 100 })).toBeNull();
    expect(computeContainedRect({ containerWidth: 800, containerHeight: 600, naturalWidth: 100, naturalHeight: -1 })).toBeNull();
  });
});

describe('regionToPinPercent', () => {
  it('places a region at the image center at the container center when there is no letterboxing', () => {
    const containedRect = { offsetX: 0, offsetY: 0, width: 800, height: 600 };
    const { leftPercent, topPercent } = regionToPinPercent({
      region: { x: 750, y: 550, width: 100, height: 100 }, // center at (800, 600) of a 1600x1200 image
      naturalWidth: 1600,
      naturalHeight: 1200,
      containedRect,
    });

    expect(leftPercent).toBeCloseTo(50, 5);
    expect(topPercent).toBeCloseTo(50, 5);
  });

  it('accounts for pillarbox offset when placing a region', () => {
    // Same portrait-in-wide-container setup as the computeContainedRect pillarbox test.
    const naturalWidth = 900;
    const naturalHeight = 1600;
    const containedRect = computeContainedRect({
      containerWidth: 1600,
      containerHeight: 900,
      naturalWidth,
      naturalHeight,
    })!;

    // A region at the image's top-left corner should land near the left
    // edge of the *rendered* image, not the left edge of the container.
    const region = { x: 0, y: 0, width: 10, height: 10 };
    const { leftPercent, topPercent } = regionToPinPercent({
      region,
      naturalWidth,
      naturalHeight,
      containedRect,
    });

    const scale = containedRect.width / naturalWidth;
    const containerWidth = containedRect.width + containedRect.offsetX * 2;
    const expectedPixelLeft = containedRect.offsetX + (region.width / 2) * scale;
    expect(leftPercent).toBeCloseTo((expectedPixelLeft / containerWidth) * 100, 5);
    expect(leftPercent).toBeGreaterThan(0); // not flush against the container edge
    expect(topPercent).toBeCloseTo(((region.height / 2) * scale / containedRect.height) * 100, 2); // small offset from the region's own half-height, no pillarbox vertical offset
  });

  it('places a region at the bottom-right corner near the container edge', () => {
    const containedRect = { offsetX: 0, offsetY: 0, width: 800, height: 600 };
    const { leftPercent, topPercent } = regionToPinPercent({
      region: { x: 1590, y: 1190, width: 10, height: 10 },
      naturalWidth: 1600,
      naturalHeight: 1200,
      containedRect,
    });

    expect(leftPercent).toBeGreaterThan(99);
    expect(topPercent).toBeGreaterThan(99);
  });
});
