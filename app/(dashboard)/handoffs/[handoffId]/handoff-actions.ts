'use server';

import type { Handoff } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ACTIVE_HANDOFF_CAP } from '@/lib/plan-limits';
import { deleteObject } from '@/lib/storage';
import type { ActionResult } from '@/lib/types';
import { createHandoffSchema } from '@/lib/validators/handoff';

/**
 * Lives here (not app/(dashboard)/handoffs/actions.ts) per
 * architecture.md's directory layout and
 * .agents/skills/api-route-scaffolder/SKILL.md — every dashboard server
 * action for the handoffs feature area is centralized in this feature
 * directory, including createHandoff even though it predates having a
 * handoffId.
 */
export async function createHandoff(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = createHandoffSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { planTier: true },
  });

  const activeHandoffCount = await db.handoff.count({
    where: { ownerId: session.user.id, status: { not: 'Archived' } },
  });

  const cap = ACTIVE_HANDOFF_CAP[user.planTier];

  if (activeHandoffCount >= cap) {
    return {
      ok: false,
      error: {
        code: 'handoff_cap_reached',
        message: `You've reached your plan's limit of ${cap} active handoffs. Archive one to create another.`,
      },
    };
  }

  let handoff: Handoff;

  try {
    handoff = await db.handoff.create({
      data: {
        ownerId: session.user.id,
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });
  } catch (error) {
    logger.error('handoff.create.failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not create the handoff.' } };
  }

  logger.info('handoff.created', { handoffId: handoff.id });
  revalidatePath('/handoffs');

  return { ok: true, data: { id: handoff.id } };
}

/**
 * Duplicates a handoff's *component* skeleton — Component, its
 * Specifications/States, and any Component-scoped ResponsiveRules — into a
 * brand-new Draft handoff. Deliberately does NOT duplicate Screens,
 * DesignAssets, or ComponentInstances: a Screen requires a DesignAsset
 * (an uploaded image in R2 storage), and DesignAsset.onDelete: Cascade
 * deletes every Screen referencing it — so a duplicated Screen sharing the
 * original's DesignAsset would mean deleting the *original* handoff's
 * asset silently deletes the *duplicate*'s screen too, a genuine
 * cross-handoff data-loss hazard. Actually copying the underlying image in
 * storage would avoid that, but is a materially bigger feature (real
 * storage I/O, not a DB copy) than "duplicate a component set" calls for.
 * A duplicate also never inherits AnalysisRun/DesignerDecision/
 * HandoffIssue/DeveloperFlag/ShareLink history — it starts unanalyzed, not
 * mid-review.
 */
export async function duplicateHandoff(sourceHandoffId: string): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const source = await db.handoff.findUnique({ where: { id: sourceHandoffId } });

  if (!source || source.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { planTier: true },
  });

  const activeHandoffCount = await db.handoff.count({
    where: { ownerId: session.user.id, status: { not: 'Archived' } },
  });

  const cap = ACTIVE_HANDOFF_CAP[user.planTier];

  if (activeHandoffCount >= cap) {
    return {
      ok: false,
      error: {
        code: 'handoff_cap_reached',
        message: `You've reached your plan's limit of ${cap} active handoffs. Archive one to create another.`,
      },
    };
  }

  const sourceComponents = await db.component.findMany({
    where: { handoffId: sourceHandoffId },
    include: { specifications: true, states: true, responsiveRules: true },
    orderBy: { createdAt: 'asc' },
  });

  let newHandoffId: string;

  try {
    newHandoffId = await db.$transaction(async (tx) => {
      const newHandoff = await tx.handoff.create({
        data: { ownerId: session.user.id, name: `${source.name} (copy)`, description: source.description },
      });

      for (const component of sourceComponents) {
        const newComponent = await tx.component.create({
          data: {
            handoffId: newHandoff.id,
            name: component.name,
            type: component.type,
            description: component.description,
            confidence: component.confidence,
            provenance: component.provenance,
            // Reviewed status doesn't carry over — a duplicate is new,
            // unreviewed content in its own right, not a pre-confirmed one.
          },
        });

        if (component.specifications.length > 0) {
          await tx.specification.createMany({
            data: component.specifications.map((spec) => ({
              componentId: newComponent.id,
              category: spec.category,
              property: spec.property,
              value: spec.value,
              unit: spec.unit,
              confidence: spec.confidence,
              provenance: spec.provenance,
            })),
          });
        }

        if (component.states.length > 0) {
          await tx.componentState.createMany({
            data: component.states.map((state) => ({
              componentId: newComponent.id,
              name: state.name,
              description: state.description,
              confidence: state.confidence,
              provenance: state.provenance,
            })),
          });
        }

        if (component.responsiveRules.length > 0) {
          await tx.responsiveRule.createMany({
            data: component.responsiveRules.map((rule) => ({
              componentId: newComponent.id,
              viewportCategory: rule.viewportCategory,
              behavior: rule.behavior,
              confidence: rule.confidence,
              provenance: rule.provenance,
            })),
          });
        }
      }

      return newHandoff.id;
    });
  } catch (error) {
    logger.error('handoff.duplicate_failed', {
      sourceHandoffId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not duplicate the handoff.' } };
  }

  logger.info('handoff.duplicated', { sourceHandoffId, newHandoffId });
  revalidatePath('/handoffs');

  return { ok: true, data: { id: newHandoffId } };
}

/**
 * Archiving is the only way to free up the ACTIVE_HANDOFF_CAP once it's
 * reached (see createHandoff's error message) — a real dead end without
 * this. There's no stored "previous status," so unarchiving deliberately
 * returns to Draft rather than attempting to reconstruct where it was.
 */
export async function archiveHandoff(handoffId: string): Promise<ActionResult<{ handoffId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  await db.handoff.update({ where: { id: handoffId }, data: { status: 'Archived' } });

  logger.info('handoff.archived', { handoffId });
  revalidatePath('/handoffs');
  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { handoffId } };
}

export async function unarchiveHandoff(handoffId: string): Promise<ActionResult<{ handoffId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { planTier: true } });
  const activeCount = await db.handoff.count({
    where: { ownerId: session.user.id, status: { not: 'Archived' } },
  });
  const cap = ACTIVE_HANDOFF_CAP[user.planTier];

  if (activeCount >= cap) {
    return {
      ok: false,
      error: {
        code: 'handoff_cap_reached',
        message: `You've reached your plan's limit of ${cap} active handoffs. Archive another one first.`,
      },
    };
  }

  await db.handoff.update({ where: { id: handoffId }, data: { status: 'Draft' } });

  logger.info('handoff.unarchived', { handoffId });
  revalidatePath('/handoffs');
  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { handoffId } };
}

/**
 * A real, hard delete — not a status flag — per the PRD's data-deletion
 * requirement ("not just a soft-delete flag"). DesignerDecision and
 * AnalysisRun rows have no cascade on their handoff FK (see
 * .agents/skills/db-migration-runner/SKILL.md — AnalysisRun is treated as
 * an immutable historical record in the normal write path, deliberately not
 * cascade-deleted by accident), so they're deleted explicitly before the
 * Handoff row; everything else (DesignAsset, Screen, Component and its
 * children, ResponsiveRule, HandoffIssue, DesignerNote, ShareLink,
 * AIConversation/AIMessage) cascades from the Handoff delete itself.
 * Storage-object deletion happens after the DB transaction succeeds and is
 * best-effort — the DB rows are gone either way, which is what "deleted"
 * means to the user; a storage failure is logged, not retried, since there's
 * no longer a DB row to retry from.
 */
export async function deleteHandoff(handoffId: string): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const assets = await db.designAsset.findMany({
    where: { handoffId },
    select: { storageReference: true },
  });

  try {
    // Order matters: DesignerDecision has no cascade from Handoff, so it
    // must go first. AnalysisRun also has no cascade from Handoff, but now
    // HandoffIssue.sourceAnalysisRunId references it — deleting AnalysisRun
    // before the Handoff (and its cascaded HandoffIssue rows) would violate
    // that FK, so AnalysisRun has to be deleted last, after the cascade has
    // already cleared every HandoffIssue that could reference it.
    await db.$transaction([
      db.designerDecision.deleteMany({ where: { handoffId } }),
      db.handoff.delete({ where: { id: handoffId } }),
      db.analysisRun.deleteMany({ where: { handoffId } }),
    ]);
  } catch (error) {
    logger.error('handoff.delete_failed', {
      handoffId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not delete this handoff.' } };
  }

  await Promise.all(
    assets.map((asset) =>
      deleteObject(asset.storageReference).catch((error) => {
        logger.error('handoff.delete_storage_object_failed', {
          handoffId,
          storageReference: asset.storageReference,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }),
    ),
  );

  logger.info('handoff.deleted', { handoffId });
  revalidatePath('/handoffs');

  return { ok: true, data: { deleted: true } };
}

/**
 * Explicit, server-side ownership check — never inferred from the
 * [handoffId] route param alone. See security.md's "Ownership checks are
 * explicit, not implied by URL shape."
 */
export async function getOwnedHandoffOrNull(handoffId: string) {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return null;
  }

  return handoff;
}
