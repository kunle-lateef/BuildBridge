import type { AnalysisRunStatus, HandoffStatus } from '@prisma/client';

import { db } from '@/lib/db';
import { computeReadiness, deriveHandoffStatus } from '@/lib/readiness';

export type UnarchiveFacts = {
  /** Status of the newest analysis run of any kind, or null if none ran. */
  latestRunStatus: AnalysisRunStatus | null;
  /** Status of the newest Completed or PartiallyCompleted run, or null if none succeeded. */
  latestSuccessfulRunStatus: 'Completed' | 'PartiallyCompleted' | null;
  hasActiveShareLink: boolean;
  hasUnresolvedCritical: boolean;
};

/**
 * Where an unarchived handoff goes back to. Archive stores no "previous
 * status", so this rebuilds it from the same facts that set it in the first
 * place, using the analysis pipeline's own rules (lib/ai/pipeline.ts):
 *
 * - a run still queued or processing → Analyzing (the worker finishes it);
 * - nothing ever analysed successfully → Draft;
 * - a live share link → Shared;
 * - latest successful run only partly finished → NeedsReview;
 * - otherwise the readiness hard-gate decides (NeedsReview or Ready).
 *
 * The readiness score itself is never touched here.
 */
export function statusAfterUnarchive(facts: UnarchiveFacts): HandoffStatus {
  if (facts.latestRunStatus === 'Queued' || facts.latestRunStatus === 'Processing') return 'Analyzing';
  if (facts.latestSuccessfulRunStatus === null) return 'Draft';
  if (facts.hasActiveShareLink) return 'Shared';
  if (facts.latestSuccessfulRunStatus === 'PartiallyCompleted') return 'NeedsReview';
  return deriveHandoffStatus('Analyzing', facts.hasUnresolvedCritical);
}

export async function gatherUnarchiveFacts(handoffId: string, now: Date = new Date()): Promise<UnarchiveFacts> {
  const [latestRun, latestSuccessfulRun, activeShareLinks, readiness] = await Promise.all([
    db.analysisRun.findFirst({ where: { handoffId }, orderBy: { createdAt: 'desc' }, select: { status: true } }),
    db.analysisRun.findFirst({
      where: { handoffId, status: { in: ['Completed', 'PartiallyCompleted'] } },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    }),
    db.shareLink.count({
      where: { handoffId, status: 'Active', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
    computeReadiness(handoffId),
  ]);

  return {
    latestRunStatus: latestRun?.status ?? null,
    latestSuccessfulRunStatus: (latestSuccessfulRun?.status as UnarchiveFacts['latestSuccessfulRunStatus']) ?? null,
    hasActiveShareLink: activeShareLinks > 0,
    hasUnresolvedCritical: readiness.hasUnresolvedCritical,
  };
}
