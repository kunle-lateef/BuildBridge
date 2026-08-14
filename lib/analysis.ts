import type { User } from '@prisma/client';
import { addMonths, isBefore } from 'date-fns';


import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { enqueueAnalysisRun } from '@/lib/queue';
import type { ActionResult } from '@/lib/types';

const CURRENT_ANALYSIS_VERSION = 1;

function resolveQuota(user: Pick<User, 'analysisQuota' | 'analysisUsageCount' | 'billingCycleStart'>): {
  quotaRemaining: number;
  cycleHasRolledOver: boolean;
} {
  const cycleEnd = addMonths(user.billingCycleStart, 1);
  const cycleHasRolledOver = isBefore(cycleEnd, new Date());

  return {
    quotaRemaining: cycleHasRolledOver
      ? user.analysisQuota
      : user.analysisQuota - user.analysisUsageCount,
    cycleHasRolledOver,
  };
}

/**
 * Decides whether a new AnalysisRun is needed at all, and if so, enforces
 * quota before creating one — see
 * .agents/skills/api-route-scaffolder/SKILL.md's Step 6. Never enqueue
 * first and check quota after.
 */
export async function startAnalysisRun(
  handoffId: string,
  userId: string,
): Promise<ActionResult<{ analysisRunId: string; reused: boolean }>> {
  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== userId) {
    return { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } };
  }

  const processedAssetCount = await db.designAsset.count({
    where: { handoffId, processingStatus: 'Processed' },
  });

  if (processedAssetCount === 0) {
    return {
      ok: false,
      error: { code: 'no_screens', message: 'Upload at least one screen before starting analysis.' },
    };
  }

  const reusableRunId = await findReusableRun(handoffId);

  if (reusableRunId) {
    logger.info('analysis.reused', { handoffId, analysisRunId: reusableRunId });
    return { ok: true, data: { analysisRunId: reusableRunId, reused: true } };
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const { quotaRemaining, cycleHasRolledOver } = resolveQuota(user);

  if (quotaRemaining <= 0) {
    return {
      ok: false,
      error: {
        code: 'quota_exceeded',
        message: `You've used all ${user.analysisQuota} analyses included this billing cycle.`,
      },
    };
  }

  const analysisRun = await db.$transaction(async (tx) => {
    const run = await tx.analysisRun.create({
      data: { handoffId, status: 'Queued', analysisVersion: CURRENT_ANALYSIS_VERSION },
    });

    await tx.user.update({
      where: { id: userId },
      data: cycleHasRolledOver
        ? { analysisUsageCount: 1, billingCycleStart: new Date() }
        : { analysisUsageCount: { increment: 1 } },
    });

    await tx.handoff.update({ where: { id: handoffId }, data: { status: 'Analyzing' } });

    return run;
  });

  await enqueueAnalysisRun({ analysisRunId: analysisRun.id, handoffId });

  logger.info('analysis.enqueued', { handoffId, analysisRunId: analysisRun.id });

  return { ok: true, data: { analysisRunId: analysisRun.id, reused: false } };
}

/**
 * Checksum-matched reuse per architecture.md's Cost Control rule: if every
 * currently-Processed DesignAsset either existed before the handoff's last
 * successful run, or has a checksum matching one that did, nothing new
 * needs analyzing. Scoped to "the whole run's asset set is unchanged" —
 * the schema has no AnalysisRun-to-DesignAsset join table to support
 * reusing part of a run while re-analyzing the rest, so partial reuse
 * within a single run isn't attempted here.
 */
async function findReusableRun(handoffId: string): Promise<string | null> {
  const lastSuccessfulRun = await db.analysisRun.findFirst({
    where: { handoffId, status: 'Completed' },
    orderBy: { completedAt: 'desc' },
  });

  if (!lastSuccessfulRun) {
    return null;
  }

  const cutoff = lastSuccessfulRun.completedAt ?? lastSuccessfulRun.createdAt;

  const [priorAssets, newAssets] = await Promise.all([
    db.designAsset.findMany({
      where: { handoffId, processingStatus: 'Processed', createdAt: { lte: cutoff } },
      select: { checksum: true },
    }),
    db.designAsset.findMany({
      where: { handoffId, processingStatus: 'Processed', createdAt: { gt: cutoff } },
      select: { checksum: true },
    }),
  ]);

  const priorChecksums = new Set(priorAssets.map((asset) => asset.checksum));
  const everyNewAssetIsADuplicate = newAssets.every((asset) => priorChecksums.has(asset.checksum));

  return everyNewAssetIsADuplicate ? lastSuccessfulRun.id : null;
}
