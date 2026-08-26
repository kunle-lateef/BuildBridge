import sharp, { type Sharp } from 'sharp';

import type { NewIssueFinding } from '@/lib/decisions';

const MIN_TOUCH_TARGET_PX = 44;

// Component.type is free text (architecture.md's stage-1 list is explicitly
// open-ended), not a controlled enum, so "is this interactive" is a keyword
// match rather than an exact one. Flagged for the developer to confirm or
// extend, matching the existing convention for undecided interpretive lists
// elsewhere in this codebase (e.g. InteractionsSection.tsx's state split).
const INTERACTIVE_TYPE_KEYWORDS = [
  'button',
  'input',
  'toggle',
  'checkbox',
  'radio',
  'switch',
  'link',
  'tab',
  'select',
  'dropdown',
  'icon-button',
];

function isInteractiveType(type: string): boolean {
  const normalized = type.toLowerCase();
  return INTERACTIVE_TYPE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

type TouchTargetInput = {
  componentName: string;
  componentType: string;
  screenName: string;
  dimensions: { width: number; height: number } | null;
};

/**
 * Flags interactive components smaller than the 44×44px minimum WCAG
 * recommends for touch targets. Fully deterministic arithmetic over
 * ComponentInstance.dimensions, already persisted by stage 1 — no new
 * image analysis. `Detected` provenance since the measurement itself is
 * real, not guessed; confidence is 0.85 rather than 1.0 because
 * `dimensions` is in the uploaded image's raw pixels and nothing in the
 * schema records the export's scale factor (a 2x/3x retina export would
 * read as roughly double its actual CSS-pixel size) — see this file's
 * accompanying test for the exact case this affects.
 */
export function checkTouchTargets(components: TouchTargetInput[]): NewIssueFinding[] {
  const findings: NewIssueFinding[] = [];

  for (const component of components) {
    if (!isInteractiveType(component.componentType) || !component.dimensions) {
      continue;
    }

    const { width, height } = component.dimensions;

    if (width >= MIN_TOUCH_TARGET_PX && height >= MIN_TOUCH_TARGET_PX) {
      continue;
    }

    findings.push({
      title: `${component.componentName} is smaller than the minimum touch target size`,
      description: `${component.componentName} (${component.componentType}) on ${component.screenName} measures ${Math.round(width)}×${Math.round(height)}px — below the ${MIN_TOUCH_TARGET_PX}×${MIN_TOUCH_TARGET_PX}px minimum WCAG recommends for touch targets.`,
      severity: 'Medium',
      category: 'Accessibility',
      recommendation: `Increase the tappable area to at least ${MIN_TOUCH_TARGET_PX}×${MIN_TOUCH_TARGET_PX}px, either by resizing the element or adding padding around it.`,
      provenance: 'Detected',
      confidence: 0.85,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Contrast ratio (bounded heuristic)
//
// No OCR — there's no way to know exactly which pixels are text versus
// background, so this samples a thin strip along the component's bounding
// box edge as "background" and a small patch at its center as "foreground,"
// which is a reasonable approximation for text-on-fill components (buttons,
// labels, badges) but not a verified measurement. Only high-margin failures
// are flagged (ratio below CONTRAST_FAIL_THRESHOLD, well under WCAG AA's
// 4.5:1) to keep false positives from a wrong foreground/background guess
// low. `Suggested` provenance, not `Detected` — unlike touch-target size,
// the underlying sample locations are themselves a guess, not a direct
// measurement of the thing being reported.
// ---------------------------------------------------------------------------

const CONTRAST_FAIL_THRESHOLD = 2; // well under WCAG AA's 4.5:1 — only flags egregious cases
const MIN_SAMPLE_REGION_PX = 8; // regions smaller than this can't be usefully split into edge/center samples
const CONTRAST_CONFIDENCE = 0.65; // within the plan's documented ~0.6-0.8 range for this sampling method

type ContrastCheckInput = {
  componentName: string;
  componentType: string;
  screenName: string;
  region: { x: number; y: number; width: number; height: number };
  imageBuffer: Buffer;
};

type Rgb = { r: number; g: number; b: number };

function relativeLuminance({ r, g, b }: Rgb): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG's contrast ratio formula — always >= 1, higher is more contrast. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const lA = relativeLuminance(a);
  const lB = relativeLuminance(b);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

async function sampleAverageColor(
  image: Sharp,
  extractRegion: { left: number; top: number; width: number; height: number },
): Promise<Rgb | null> {
  try {
    const { data, info } = await image
      .clone()
      .extract(extractRegion)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let i = 0; i + channels <= data.length; i += channels) {
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
      count += 1;
    }

    return count === 0 ? null : { r: r / count, g: g / count, b: b / count };
  } catch {
    return null;
  }
}

/**
 * Samples an approximate foreground/background contrast ratio per component
 * region within its screen's already-uploaded image and flags egregious
 * (sub-CONTRAST_FAIL_THRESHOLD) failures. One screen's image is decoded once
 * and reused across all of that screen's regions by the caller passing the
 * same `imageBuffer` for every input sharing a screen.
 */
export async function checkContrast(inputs: ContrastCheckInput[]): Promise<NewIssueFinding[]> {
  const findings: NewIssueFinding[] = [];

  for (const input of inputs) {
    try {
      const { x, y, width, height } = input.region;
      if (width < MIN_SAMPLE_REGION_PX || height < MIN_SAMPLE_REGION_PX) continue;

      const image = sharp(input.imageBuffer);
      const metadata = await image.metadata();
      const imageWidth = metadata.width ?? 0;
      const imageHeight = metadata.height ?? 0;

      const left = Math.max(0, Math.round(x));
      const top = Math.max(0, Math.round(y));
      const regionWidth = Math.min(Math.round(width), imageWidth - left);
      const regionHeight = Math.min(Math.round(height), imageHeight - top);
      if (regionWidth < MIN_SAMPLE_REGION_PX || regionHeight < MIN_SAMPLE_REGION_PX) continue;

      const centerWidth = Math.max(1, Math.floor(regionWidth / 3));
      const centerHeight = Math.max(1, Math.floor(regionHeight / 3));
      const edgeHeight = Math.max(1, Math.floor(regionHeight / 4));

      const [background, foreground] = await Promise.all([
        sampleAverageColor(image, { left, top, width: regionWidth, height: edgeHeight }),
        sampleAverageColor(image, {
          left: left + Math.floor((regionWidth - centerWidth) / 2),
          top: top + Math.floor((regionHeight - centerHeight) / 2),
          width: centerWidth,
          height: centerHeight,
        }),
      ]);

      if (!background || !foreground) continue;

      const ratio = contrastRatio(background, foreground);
      if (ratio >= CONTRAST_FAIL_THRESHOLD) continue;

      findings.push({
        title: `${input.componentName} may have insufficient color contrast`,
        description: `${input.componentName} (${input.componentType}) on ${input.screenName} samples an approximate contrast ratio of ${ratio.toFixed(1)}:1 between its foreground and background — WCAG AA requires at least 4.5:1 for normal text. This is a bounded pixel-sampling estimate, not a verified measurement, since there is no OCR to confirm which pixels are actually text.`,
        severity: 'Medium',
        category: 'Accessibility',
        recommendation:
          'Verify the actual text/background color contrast (e.g. with a contrast checker) and adjust if it falls below the WCAG AA 4.5:1 minimum.',
        provenance: 'Suggested',
        confidence: CONTRAST_CONFIDENCE,
      });
    } catch {
      // An unreadable image or malformed region must not abort every other
      // component's contrast check — same defensive stance as
      // sampleAverageColor's own try/catch, one level up.
      continue;
    }
  }

  return findings;
}
