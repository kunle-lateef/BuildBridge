import type { DesignerDecisionAction, FindingType } from '@prisma/client';

import { db } from '@/lib/db';

export type LatestDecision = { action: DesignerDecisionAction; previousValue: string | null; createdAt: Date };

/**
 * The designer's most recent decision on each finding of one type, read from
 * the DesignerDecision audit trail. Used to show "Modified · was …" and, when
 * a re-analysis conflicts, what the designer had decided and when.
 */
export async function getLatestDecisions(handoffId: string, findingType: FindingType): Promise<Map<string, LatestDecision>> {
  const decisions = await db.designerDecision.findMany({
    where: { handoffId, findingType },
    select: { findingReference: true, action: true, previousValue: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const latest = new Map<string, LatestDecision>();
  for (const decision of decisions) {
    if (!latest.has(decision.findingReference)) {
      latest.set(decision.findingReference, { action: decision.action, previousValue: decision.previousValue, createdAt: decision.createdAt });
    }
  }
  return latest;
}
