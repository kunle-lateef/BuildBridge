import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

import { logger } from '@/lib/logger';

// Stub for Phase 0 — proves the seed script wires up correctly end to end.
// Expanded in Phase P0a into a fixture-driven demo handoff (see the "Fixture
// / Mock Strategy" section of the implementation plan): a demo user plus a
// demo handoff/assets run through lib/ai/client.ts's mock mode, so a single
// `npm run db:seed` produces a fully-analyzed handoff to build the review UI
// against without repeated uploads or Anthropic spend.
const prisma = new PrismaClient();

async function main() {
  logger.info('seed.stub_run', { note: 'No fixture data yet — expanded in Phase P0a.' });
}

main()
  .catch((error) => {
    logger.error('seed.failed', { error: error instanceof Error ? error.message : 'unknown' });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
