import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { checkContrast, checkTouchTargets, contrastRatio } from './accessibility';

describe('checkTouchTargets', () => {
  it('flags an interactive component smaller than 44x44px', () => {
    const findings = checkTouchTargets([
      {
        componentName: 'Close icon button',
        componentType: 'icon-button',
        screenName: 'Checkout',
        dimensions: { width: 24, height: 24 },
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe('Accessibility');
    expect(findings[0]?.provenance).toBe('Detected');
    expect(findings[0]?.description).toContain('24×24px');
  });

  it('does not flag an interactive component that meets the minimum', () => {
    const findings = checkTouchTargets([
      {
        componentName: 'Primary Button',
        componentType: 'button',
        screenName: 'Checkout',
        dimensions: { width: 120, height: 48 },
      },
    ]);

    expect(findings).toHaveLength(0);
  });

  it('does not flag a non-interactive component regardless of size', () => {
    const findings = checkTouchTargets([
      {
        componentName: 'Product thumbnail',
        componentType: 'card',
        screenName: 'Checkout',
        dimensions: { width: 20, height: 20 },
      },
    ]);

    expect(findings).toHaveLength(0);
  });

  it('skips a component with no persisted dimensions rather than guessing', () => {
    const findings = checkTouchTargets([
      {
        componentName: 'Submit Button',
        componentType: 'button',
        screenName: 'Checkout',
        dimensions: null,
      },
    ]);

    expect(findings).toHaveLength(0);
  });

  it('flags a component that is wide enough but too short (or vice versa) — both dimensions must clear the minimum', () => {
    const findings = checkTouchTargets([
      {
        componentName: 'Wide but short button',
        componentType: 'button',
        screenName: 'Checkout',
        dimensions: { width: 200, height: 30 },
      },
    ]);

    expect(findings).toHaveLength(1);
  });

  it('produces a deterministic title for the same input, so reconciliation across runs treats it as re-confirmation', () => {
    const input = [
      {
        componentName: 'Close icon button',
        componentType: 'icon-button',
        screenName: 'Checkout',
        dimensions: { width: 24, height: 24 },
      },
    ];

    const first = checkTouchTargets(input);
    const second = checkTouchTargets(input);

    expect(first[0]?.title).toBe(second[0]?.title);
  });
});

describe('contrastRatio', () => {
  it('returns the maximum ~21:1 ratio for pure black against pure white', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical colors', () => {
    expect(contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 })).toBeCloseTo(1, 5);
  });

  it('is symmetric — argument order does not change the result', () => {
    const a = { r: 10, g: 20, b: 30 };
    const b = { r: 200, g: 210, b: 220 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

/** A solid `background` image with an optional solid `foreground` square centered in `region`. */
async function buildTestImage(options: {
  imageSize: number;
  background: [number, number, number];
  region: { x: number; y: number; width: number; height: number };
  foreground?: [number, number, number];
}): Promise<Buffer> {
  const { imageSize, background, region, foreground } = options;
  const channels = 3;
  const pixels = Buffer.alloc(imageSize * imageSize * channels);

  for (let i = 0; i < pixels.length; i += channels) {
    pixels[i] = background[0];
    pixels[i + 1] = background[1];
    pixels[i + 2] = background[2];
  }

  if (foreground) {
    // Matches checkContrast's own center-patch geometry exactly, so the test
    // image's "foreground square" lands precisely where checkContrast samples.
    const centerWidth = Math.max(1, Math.floor(region.width / 3));
    const centerHeight = Math.max(1, Math.floor(region.height / 3));
    const left = region.x + Math.floor((region.width - centerWidth) / 2);
    const top = region.y + Math.floor((region.height - centerHeight) / 2);

    for (let y = top; y < top + centerHeight; y++) {
      for (let x = left; x < left + centerWidth; x++) {
        const i = (y * imageSize + x) * channels;
        pixels[i] = foreground[0];
        pixels[i + 1] = foreground[1];
        pixels[i + 2] = foreground[2];
      }
    }
  }

  return sharp(pixels, { raw: { width: imageSize, height: imageSize, channels } }).png().toBuffer();
}

describe('checkContrast', () => {
  it('flags a component whose sampled foreground/background are effectively the same color', async () => {
    const region = { x: 5, y: 5, width: 30, height: 30 };
    const imageBuffer = await buildTestImage({ imageSize: 40, background: [128, 128, 128], region });

    const findings = await checkContrast([
      { componentName: 'Ghost button', componentType: 'button', screenName: 'Checkout', region, imageBuffer },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe('Accessibility');
    expect(findings[0]?.provenance).toBe('Suggested');
  });

  it('does not flag a component with a clearly high-contrast foreground/background split', async () => {
    const region = { x: 5, y: 5, width: 30, height: 30 };
    const imageBuffer = await buildTestImage({
      imageSize: 40,
      background: [0, 0, 0],
      region,
      foreground: [255, 255, 255],
    });

    const findings = await checkContrast([
      { componentName: 'Primary button', componentType: 'button', screenName: 'Checkout', region, imageBuffer },
    ]);

    expect(findings).toHaveLength(0);
  });

  it('skips a region too small to sample meaningfully', async () => {
    const region = { x: 5, y: 5, width: 3, height: 3 };
    const imageBuffer = await buildTestImage({ imageSize: 40, background: [128, 128, 128], region });

    const findings = await checkContrast([
      { componentName: 'Tiny icon', componentType: 'icon', screenName: 'Checkout', region, imageBuffer },
    ]);

    expect(findings).toHaveLength(0);
  });
});
