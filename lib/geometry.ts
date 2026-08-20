export type Region = { x: number; y: number; width: number; height: number };

export type ContainedRect = { offsetX: number; offsetY: number; width: number; height: number };

/**
 * Runtime shape guard for `ComponentInstance.dimensions` (typed `Json?` in
 * Prisma — never narrowed for us). A region failing this check means "no
 * pin," not an error — see lib/screenPins.ts.
 */
export function isValidRegion(value: unknown): value is Region {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.x === 'number' &&
    typeof record.y === 'number' &&
    typeof record.width === 'number' &&
    typeof record.height === 'number' &&
    record.width > 0 &&
    record.height > 0
  );
}

/**
 * The standard `object-fit: contain` rect: the actual on-screen position and
 * size of an image inside a container it doesn't exactly fill, centered on
 * whichever axis has slack (pillarboxed if the image is relatively taller
 * than the container, letterboxed if relatively wider). Returns null for
 * degenerate input rather than dividing by zero or returning NaN.
 */
export function computeContainedRect({
  containerWidth,
  containerHeight,
  naturalWidth,
  naturalHeight,
}: {
  containerWidth: number;
  containerHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}): ContainedRect | null {
  if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  return {
    offsetX: (containerWidth - width) / 2,
    offsetY: (containerHeight - height) / 2,
    width,
    height,
  };
}

/**
 * A region's center as a percentage of the *container* (not the image), so
 * callers can set `style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}`
 * directly on an absolutely-positioned pin without any further math — the
 * `containedRect`'s offset already accounts for letterboxing/pillarboxing.
 */
export function regionToPinPercent({
  region,
  naturalWidth,
  naturalHeight,
  containedRect,
}: {
  region: Region;
  naturalWidth: number;
  naturalHeight: number;
  containedRect: ContainedRect;
}): { leftPercent: number; topPercent: number } {
  // computeContainedRect uses one uniform scale for both axes, so these are
  // equal in practice — computed separately anyway so a caller passing a
  // containedRect from anywhere else still gets a correct result per axis.
  const scaleX = containedRect.width / naturalWidth;
  const scaleY = containedRect.height / naturalHeight;
  const centerX = region.x + region.width / 2;
  const centerY = region.y + region.height / 2;

  const pixelLeft = containedRect.offsetX + centerX * scaleX;
  const pixelTop = containedRect.offsetY + centerY * scaleY;

  const containerWidth = containedRect.width + containedRect.offsetX * 2;
  const containerHeight = containedRect.height + containedRect.offsetY * 2;

  return {
    leftPercent: (pixelLeft / containerWidth) * 100,
    topPercent: (pixelTop / containerHeight) * 100,
  };
}
