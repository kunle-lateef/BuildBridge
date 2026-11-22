import { db } from '@/lib/db';

/**
 * The designer's answer to each gap: the newValue of the latest Override
 * decision on that HandoffIssue ("Save answer" in the Review panel records
 * an Override, which resolves the gap — see lib/decisions.ts). Read from the
 * DesignerDecision audit trail rather than stored on the issue, so the
 * answer can never be silently replaced by a later analysis run.
 */
export async function getGapAnswers(handoffId: string): Promise<Map<string, string>> {
  const decisions = await db.designerDecision.findMany({
    where: { handoffId, findingType: 'HandoffIssue', action: 'Override', newValue: { not: null } },
    select: { findingReference: true, newValue: true },
    orderBy: { createdAt: 'desc' },
  });

  const answers = new Map<string, string>();
  for (const decision of decisions) {
    if (decision.newValue && !answers.has(decision.findingReference)) {
      answers.set(decision.findingReference, decision.newValue);
    }
  }
  return answers;
}
