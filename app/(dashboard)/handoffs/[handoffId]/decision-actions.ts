'use server';

import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applyDecisionToFinding, fetchFindingsForBulk, resolveFinding } from '@/lib/decisions';
import { logger } from '@/lib/logger';
import { recomputeHandoffReadiness } from '@/lib/readiness';
import type { ActionResult } from '@/lib/types';
import { bulkRecordDecisionSchema, recordDesignerDecisionSchema } from '@/lib/validators/decision';

/**
 * Records a designer decision (Confirm/Modify/Reject/Override) against a
 * finding and applies it in the same transaction — see
 * .agents/skills/api-route-scaffolder/SKILL.md's Step 5. The decision row
 * and the finding's new reviewStatus/status land together or not at all.
 */
export async function recordDesignerDecision(input: {
  findingType: string;
  findingReference: string;
  action: string;
  newValue?: string;
  note?: string;
}): Promise<ActionResult<{ decisionId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = recordDesignerDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { findingType, findingReference, action, newValue, note } = parsed.data;

  const finding = await resolveFinding(findingType, findingReference);

  if (!finding) {
    return notFoundError('Finding not found.');
  }

  const handoff = await db.handoff.findUnique({ where: { id: finding.handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Finding not found.');
  }

  let decisionId: string;

  try {
    decisionId = await db.$transaction(async (tx) => {
      const decision = await tx.designerDecision.create({
        data: {
          handoffId: finding.handoffId,
          findingType,
          findingReference,
          action,
          previousValue: finding.currentValue,
          newValue: newValue ?? null,
          note,
          createdBy: session.user.id,
        },
      });

      await applyDecisionToFinding(tx, findingType, findingReference, action, newValue);

      return decision.id;
    });
  } catch (error) {
    logger.error('decision.record_failed', {
      handoffId: finding.handoffId,
      findingType,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not record your decision.' } };
  }

  // Recompute and re-cache readiness — a decision on a HandoffIssue changes
  // which unresolved issues feed the formula. See architecture.md's
  // Readiness Score section.
  await recomputeHandoffReadiness(finding.handoffId, handoff.status);

  logger.info('handoff.decision.recorded', { handoffId: finding.handoffId, findingType, action });
  revalidatePath(`/handoffs/${finding.handoffId}`);

  return { ok: true, data: { decisionId } };
}

/**
 * Confirm/Reject a batch of same-type, same-provenance findings at once —
 * see AGENTS.md's Non-Negotiable #2: a bulk action must never be able to
 * sweep up a different provenance tier than the one the designer explicitly
 * chose. Fails the whole batch closed on any mismatch (wrong handoff, wrong
 * provenance, an id that doesn't resolve) rather than partially applying to
 * a subset — a partial-success result on a tampering signal is more
 * confusing than a clean rejection. Each finding still gets its own
 * DesignerDecision row (note: 'Bulk action') — bulk is a UI convenience,
 * not an audit shortcut.
 */
export async function bulkRecordDecision(input: {
  handoffId: string;
  findingType: string;
  provenance: string;
  action: string;
  findingReferences: string[];
}): Promise<ActionResult<{ decidedCount: number; skippedCount: number }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = bulkRecordDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, findingType, provenance, action, findingReferences } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const rows = await fetchFindingsForBulk(findingType, findingReferences);

  if (rows.length !== findingReferences.length) {
    return { ok: false, error: { code: 'invalid_input', message: 'One or more findings could not be found.' } };
  }

  if (rows.some((row) => row.handoffId !== handoffId)) {
    return notFoundError('Handoff not found.');
  }

  if (rows.some((row) => row.provenance !== provenance)) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: 'All selected findings must share the same provenance.' },
    };
  }

  const toDecide = rows.filter((row) => !row.isAlreadyDecided);

  try {
    await db.$transaction(async (tx) => {
      for (const row of toDecide) {
        await tx.designerDecision.create({
          data: {
            handoffId,
            findingType,
            findingReference: row.id,
            action,
            previousValue: null,
            newValue: null,
            note: 'Bulk action',
            createdBy: session.user.id,
          },
        });

        await applyDecisionToFinding(tx, findingType, row.id, action, undefined);
      }
    });
  } catch (error) {
    logger.error('decision.bulk_record_failed', {
      handoffId,
      findingType,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not record the bulk decision.' } };
  }

  await recomputeHandoffReadiness(handoffId, handoff.status);

  logger.info('handoff.decision.bulk_recorded', {
    handoffId,
    findingType,
    provenance,
    action,
    decidedCount: toDecide.length,
  });
  revalidatePath(`/handoffs/${handoffId}`);

  return {
    ok: true,
    data: { decidedCount: toDecide.length, skippedCount: rows.length - toDecide.length },
  };
}
