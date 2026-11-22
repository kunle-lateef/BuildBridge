import 'dotenv/config';

import { createHash, randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';

import { runAnalysisPipeline } from '@/lib/ai/pipeline';
import { logger } from '@/lib/logger';
import { putObject } from '@/lib/storage';
import { generateSecureToken } from '@/lib/tokens';

/**
 * Local development seed: a test designer account and three sample handoffs
 * so every dashboard and Review state can be checked against Figma without
 * uploading screens by hand.
 *
 * Runs the real analysis pipeline (lib/ai/pipeline.ts) in fixture mode, so
 * findings pass through the same Zod schemas and persistence as production
 * data. Refuses to run unless USE_AI_FIXTURES is on and the database is
 * local, so it can never spend API credit or touch a real database.
 *
 * Re-running replaces the seeded handoffs (matched by name, for the seed
 * account only). Nothing else is touched.
 *
 * Local test account (localhost only, never a real account):
 *   designer@buildbridge.test / LocalTest#2026
 */

const prisma = new PrismaClient();

const SEED_EMAIL = 'designer@buildbridge.test';
const SEED_PASSWORD = 'LocalTest#2026';
const SEED_NAME = 'Local Designer';

type ScreenSpec = { name: string; title: string; subtitle: string; rows: string[]; button: string };

const CHECKOUT_SCREENS: ScreenSpec[] = [
  { name: 'Cart', title: 'Your cart', subtitle: 'Step 1 of 3 · Cart', rows: ['Wireless headphones', 'Charging case'], button: 'Continue' },
  { name: 'Checkout', title: 'Checkout', subtitle: 'Step 2 of 3 · Payment', rows: ['Card number', 'Expiry', 'CVC'], button: 'Pay $43.45' },
  { name: 'Confirmation', title: 'Order placed', subtitle: 'Step 3 of 3 · Done', rows: ['Order #48213', 'Arrives Thursday'], button: 'Track order' },
  { name: 'Payment error', title: 'Checkout', subtitle: 'Step 2 of 3 · Payment', rows: ['Card number', 'Expiry'], button: 'Try again' },
];

const TAB_BAR_SCREENS: ScreenSpec[] = [
  { name: 'Home tab', title: 'Home', subtitle: 'Tab bar · Home selected', rows: ['Recent', 'Saved'], button: 'Browse' },
  { name: 'Profile tab', title: 'Profile', subtitle: 'Tab bar · Profile selected', rows: ['Account', 'Settings'], button: 'Edit profile' },
];

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** A simple, recognisable phone-sized screen, rendered to PNG with sharp. */
async function renderScreen(spec: ScreenSpec): Promise<Buffer> {
  const rows = spec.rows
    .map(
      (row, i) =>
        `<rect x="28" y="${150 + i * 76}" width="334" height="52" rx="8" fill="#fff" stroke="#E1E5EC"/>` +
        `<text x="44" y="${182 + i * 76}" font-family="Inter, Arial, sans-serif" font-size="16" fill="#636B7E">${escapeXml(row)}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
    <rect width="390" height="844" fill="#F9FAFC"/>
    <text x="28" y="96" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600" fill="#0E1320">${escapeXml(spec.title)}</text>
    <text x="28" y="124" font-family="Inter, Arial, sans-serif" font-size="14" fill="#4A5366">${escapeXml(spec.subtitle)}</text>
    ${rows}
    <rect x="28" y="740" width="334" height="52" rx="8" fill="#4F46E5"/>
    <text x="195" y="772" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="600" fill="#fff">${escapeXml(spec.button)}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function addScreens(handoffId: string, specs: ScreenSpec[]): Promise<void> {
  for (const [order, spec] of specs.entries()) {
    const bytes = await renderScreen(spec);
    const storageKey = `handoffs/${handoffId}/${randomUUID()}.png`;
    await putObject(storageKey, bytes, 'image/png');
    const metadata = await sharp(bytes).metadata();
    const asset = await prisma.designAsset.create({
      data: {
        handoffId,
        filename: `${spec.name}.png`,
        mediaType: 'image/png',
        size: bytes.length,
        storageReference: storageKey,
        checksum: createHash('sha256').update(bytes).digest('hex'),
        processingStatus: 'Processed',
      },
    });
    await prisma.screen.create({
      data: {
        handoffId,
        assetId: asset.id,
        name: spec.name,
        order,
        dimensions: { width: metadata.width ?? null, height: metadata.height ?? null },
        analysisStatus: 'Pending',
      },
    });
  }
}

/** Mirrors lib/analysis.ts's startAnalysisRun, then runs the pipeline inline instead of via the queue. */
async function analyze(handoffId: string, userId: string): Promise<void> {
  const run = await prisma.analysisRun.create({
    data: { handoffId, status: 'Queued', analysisVersion: 2 },
  });
  await prisma.user.update({ where: { id: userId }, data: { analysisUsageCount: { increment: 1 } } });
  await prisma.handoff.update({ where: { id: handoffId }, data: { status: 'Analyzing' } });
  await runAnalysisPipeline(run.id);
}

async function main() {
  const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? '');
  if (process.env.USE_AI_FIXTURES !== 'true' || !isLocalDb) {
    throw new Error('Seed only runs against a local database with USE_AI_FIXTURES="true".');
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: SEED_EMAIL },
    update: {},
    create: { email: SEED_EMAIL, name: SEED_NAME, passwordHash },
  });

  const names = ['Ledger · Checkout v3', 'iOS tab bar', 'Ledger · Onboarding'] as const;
  // analysis_runs.handoff_id is ON DELETE RESTRICT, so runs must go before
  // the handoff (issues that cite a run are ON DELETE SET NULL, so that's safe).
  const previous = await prisma.handoff.findMany({ where: { ownerId: user.id, name: { in: [...names] } }, select: { id: true } });
  for (const { id } of previous) {
    await prisma.$transaction([
      prisma.designerDecision.deleteMany({ where: { handoffId: id } }),
      prisma.analysisRun.deleteMany({ where: { handoffId: id } }),
      prisma.handoff.delete({ where: { id } }),
    ]);
  }
  await prisma.user.update({ where: { id: user.id }, data: { analysisUsageCount: 0, billingCycleStart: new Date() } });

  // 1. A fully analysed handoff with open gaps: the main Review state.
  const checkout = await prisma.handoff.create({
    data: { ownerId: user.id, name: names[0], description: 'Checkout flow, v3 of the payment step.' },
  });
  await addScreens(checkout.id, CHECKOUT_SCREENS);
  await analyze(checkout.id, user.id);

  // 2. Analysed and shared, with two open developer flags.
  const tabBar = await prisma.handoff.create({ data: { ownerId: user.id, name: names[1] } });
  await addScreens(tabBar.id, TAB_BAR_SCREENS);
  await analyze(tabBar.id, user.id);
  const shareToken = generateSecureToken();
  const shareLink = await prisma.shareLink.create({
    data: { handoffId: tabBar.id, tokenReference: shareToken.tokenHash },
  });
  for (const [kind, message] of [
    ['Question', 'Is the order summary sticky on tablet?'],
    ['Mismatch', 'Active tab color differs from the spec'],
  ] as const) {
    await prisma.developerFlag.create({
      data: {
        handoffId: tabBar.id,
        shareLinkId: shareLink.id,
        kind,
        message,
        submittedByName: 'Sam (developer)',
        trackingTokenHash: generateSecureToken().tokenHash,
      },
    });
  }

  // 3. Screens uploaded, analysis queued but not run: the Analyzing state.
  const onboarding = await prisma.handoff.create({ data: { ownerId: user.id, name: names[2], status: 'Analyzing' } });
  await addScreens(onboarding.id, CHECKOUT_SCREENS.slice(0, 2));
  await prisma.analysisRun.create({ data: { handoffId: onboarding.id, status: 'Processing', analysisVersion: 2, startedAt: new Date() } });

  logger.info('seed.done', { handoffs: names.length });
  // Printed to the terminal for local use only; the structured logger never
  // carries share tokens (security.md).
  // eslint-disable-next-line no-console -- local seed output only
  console.log('Share link for iOS tab bar:', `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/share/${shareToken.rawToken}`);
}

main()
  .catch((error) => {
    logger.error('seed.failed', {
      error: error instanceof Error ? error.message || `${error.name} (is local storage running on :9000?)` : 'unknown',
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
