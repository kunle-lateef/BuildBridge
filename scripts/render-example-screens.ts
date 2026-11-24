/**
 * Renders the example handoff's screens to public/example/*.png.
 * Run after changing lib/example/screens.ts:  npx tsx scripts/render-example-screens.ts
 * The PNGs are committed; nothing renders them at request time.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { EXAMPLE_SCREENS } from '../lib/example/screens';

const outDir = path.join(process.cwd(), 'public', 'example');
mkdirSync(outDir, { recursive: true });

async function main() {
  for (const screen of EXAMPLE_SCREENS) {
    const png = await sharp(Buffer.from(screen.svg), { density: 144 }).resize(480, 600).png().toBuffer();
    writeFileSync(path.join(outDir, screen.file), png);
    // eslint-disable-next-line no-console -- one-off build script
    console.log('wrote', screen.file, png.length, 'bytes');
  }
}

void main();
