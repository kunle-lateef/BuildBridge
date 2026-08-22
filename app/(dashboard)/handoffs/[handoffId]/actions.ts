'use server';

import { createHash } from 'node:crypto';

import type { Handoff } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';


import { startAnalysisRun } from '@/lib/analysis';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applyDecisionToFinding, fetchFindingsForBulk, resolveFinding } from '@/lib/decisions';
import { logger } from '@/lib/logger';
import { ACTIVE_HANDOFF_CAP } from '@/lib/plan-limits';
import { rateLimit } from '@/lib/rate-limit';
import { recomputeHandoffReadiness } from '@/lib/readiness';
import { generateShareToken } from '@/lib/share';
import { deleteObject, getObjectBytes, putObject } from '@/lib/storage';
import type { ActionResult } from '@/lib/types';
import { bulkRecordDecisionSchema, recordDesignerDecisionSchema } from '@/lib/validators/decision';
import { createHandoffSchema } from '@/lib/validators/handoff';
import { addDesignerNoteSchema, editDesignerNoteSchema } from '@/lib/validators/note';
import { createScreenFlowSchema } from '@/lib/validators/screenFlow';
import { createShareLinkSchema, revokeShareLinkSchema, updateDeveloperFlagStatusSchema } from '@/lib/validators/share';
import { ALLOWED_UPLOAD_MEDIA_TYPES, recordUploadSchema } from '@/lib/validators/upload';

// These two error shapes are constructed identically at nearly every action
// below — not to hide the ownership check itself (that stays explicit and
// inline at each call site per security.md's "explicit, not implied by URL
// shape"), just to stop retyping the same error literal by hand everywhere.
function unauthenticatedError() {
  return { ok: false as const, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
}

function notFoundError(message: string) {
  return { ok: false as const, error: { code: 'not_found', message } };
}

/**
 * Lives here (not app/(dashboard)/handoffs/actions.ts) per
 * architecture.md's directory layout and
 * .agents/skills/api-route-scaffolder/SKILL.md — every dashboard server
 * action for the handoffs feature area is centralized in this one file,
 * including createHandoff even though it predates having a handoffId.
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
 * Records a completed direct-to-R2 upload as a DesignAsset + Screen, after
 * running the post-upload validation security.md requires: real magic-byte
 * type checking (not the client-declared MIME type), EXIF stripping, and a
 * checksum for the AI pipeline's cost-reuse logic. Runs synchronously in
 * this action rather than via the queue — unlike a Claude API call, this is
 * a single small-image fetch/re-encode, not the kind of long-running work
 * architecture.md's queue rule is aimed at.
 *
 * A file that fails validation still gets a DesignAsset row (status
 * Failed) rather than being silently dropped — Failed is a first-class
 * state in AssetProcessingStatus, and the designer needs to see *why* an
 * upload was rejected. What must never happen is a "partial" row: a Screen
 * is only ever created together with a successfully Processed asset.
 */
export async function recordUpload(input: {
  handoffId: string;
  storageKey: string;
  filename: string;
  mediaType: string;
  size: number;
}): Promise<ActionResult<{ screenId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = recordUploadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, storageKey, filename, mediaType, size } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const asset = await db.designAsset.create({
    data: {
      handoffId,
      filename,
      mediaType,
      size,
      storageReference: storageKey,
      checksum: '',
      processingStatus: 'Uploaded',
    },
  });

  try {
    await db.designAsset.update({ where: { id: asset.id }, data: { processingStatus: 'Processing' } });

    const bytes = await getObjectBytes(storageKey);
    const detectedType = await fileTypeFromBuffer(bytes);

    if (!detectedType || !ALLOWED_UPLOAD_MEDIA_TYPES.includes(detectedType.mime as never)) {
      await db.designAsset.update({ where: { id: asset.id }, data: { processingStatus: 'Failed' } });
      await deleteObject(storageKey);
      logger.warn('upload.validation_failed', { handoffId, detected: detectedType?.mime ?? 'unknown' });
      return {
        ok: false,
        error: {
          code: 'invalid_file',
          message:
            'This file is not a valid PNG, JPG, or WebP image. Supported formats: PNG, JPG, WebP.',
        },
      };
    }

    // Re-encoding through sharp without calling .withMetadata() strips
    // EXIF/ICC/XMP metadata by default — see security.md's File Uploads
    // section on why a screenshot's location/device data must not survive.
    const image = sharp(bytes);
    const metadata = await image.metadata();
    const cleanedBytes = await image.toBuffer();
    const checksum = createHash('sha256').update(cleanedBytes).digest('hex');

    await putObject(storageKey, cleanedBytes, mediaType);

    const existingScreenCount = await db.screen.count({ where: { handoffId } });

    const screen = await db.$transaction(async (tx) => {
      await tx.designAsset.update({
        where: { id: asset.id },
        data: { processingStatus: 'Processed', checksum },
      });

      return tx.screen.create({
        data: {
          handoffId,
          assetId: asset.id,
          name: filename,
          order: existingScreenCount,
          dimensions: { width: metadata.width ?? null, height: metadata.height ?? null },
          analysisStatus: 'Pending',
        },
      });
    });

    logger.info('upload.processed', { handoffId, screenId: screen.id });
    revalidatePath(`/handoffs/${handoffId}`);

    return { ok: true, data: { screenId: screen.id } };
  } catch (error) {
    await db.designAsset
      .update({ where: { id: asset.id }, data: { processingStatus: 'Failed' } })
      .catch(() => undefined);
    logger.error('upload.processing_failed', {
      handoffId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, error: { code: 'server_error', message: 'Could not process the upload.' } };
  }
}

/**
 * Triggers a new AnalysisRun (or reuses an existing one — see
 * lib/analysis.ts). Rate limited unconditionally per security.md's Rate
 * Limiting section, which applies to AnalysisRun creation whether the
 * endpoint is a server action or a public route.
 */
export async function startAnalysis(handoffId: string): Promise<ActionResult<{ analysisRunId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const limit = await rateLimit(`analysis-run:${session.user.id}`, 10, 60 * 60 * 1000);

  if (!limit.success) {
    return {
      ok: false,
      error: { code: 'rate_limited', message: 'Too many analysis requests. Try again later.' },
    };
  }

  const result = await startAnalysisRun(handoffId, session.user.id);

  if (result.ok) {
    revalidatePath(`/handoffs/${handoffId}`);
  }

  return result.ok
    ? { ok: true, data: { analysisRunId: result.data.analysisRunId } }
    : result;
}

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

/**
 * Creates a share link and returns its raw token exactly once — it is
 * never persisted or retrievable again after this response, only its hash
 * (ShareLink.tokenReference). See lib/share.ts.
 */
export async function createShareLink(input: {
  handoffId: string;
  expiresInDays?: number;
}): Promise<ActionResult<{ shareLinkId: string; rawToken: string; expiresAt: string | null }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = createShareLinkSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, expiresInDays } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  // A handoff that's never been analyzed has zero issues by definition, so
  // the Critical-issue check below would pass trivially — this catches that
  // loophole explicitly rather than relying on "no criticals" to imply
  // "ready." See the developer's flow audit.
  if (handoff.readinessScore === null) {
    return {
      ok: false,
      error: { code: 'not_ready', message: 'Run analysis on this handoff before sharing it.' },
    };
  }

  // The readiness hard-gate has to be enforced here, not just displayed —
  // showing "Not ready" on the review page means nothing if sharing still
  // works anyway. See design-system.md's ReadinessScore spec: an unresolved
  // Critical issue must never read as "ready," which includes never letting
  // it ship to a developer.
  const unresolvedCriticalCount = await db.handoffIssue.count({
    where: { handoffId, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
  });

  if (unresolvedCriticalCount > 0) {
    return {
      ok: false,
      error: {
        code: 'not_ready',
        message: `This handoff has ${unresolvedCriticalCount} unresolved critical issue${unresolvedCriticalCount === 1 ? '' : 's'} — resolve them before sharing.`,
      },
    };
  }

  const { rawToken, tokenHash } = generateShareToken();
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const [shareLink] = await db.$transaction([
    db.shareLink.create({ data: { handoffId, tokenReference: tokenHash, expiresAt } }),
    db.handoff.update({ where: { id: handoffId }, data: { status: 'Shared' } }),
  ]);

  logger.info('share_link.created', { handoffId, shareLinkId: shareLink.id });
  revalidatePath(`/handoffs/${handoffId}`);

  return {
    ok: true,
    data: { shareLinkId: shareLink.id, rawToken, expiresAt: expiresAt?.toISOString() ?? null },
  };
}

/** Revokes a share link — the route handler checks `status` on every read, so this takes effect immediately. */
export async function revokeShareLink(shareLinkId: string): Promise<ActionResult<{ shareLinkId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = revokeShareLinkSchema.safeParse({ shareLinkId });

  if (!parsed.success) {
    return { ok: false, error: { code: 'invalid_input', message: 'Invalid input.' } };
  }

  const shareLink = await db.shareLink.findUnique({
    where: { id: parsed.data.shareLinkId },
    include: { handoff: true },
  });

  if (!shareLink || shareLink.handoff.ownerId !== session.user.id) {
    return notFoundError('Share link not found.');
  }

  await db.shareLink.update({
    where: { id: shareLink.id },
    data: { status: 'Revoked', revokedAt: new Date() },
  });

  logger.info('share_link.revoked', { handoffId: shareLink.handoffId, shareLinkId: shareLink.id });
  revalidatePath(`/handoffs/${shareLink.handoffId}`);

  return { ok: true, data: { shareLinkId: shareLink.id } };
}

/**
 * The ownership-check pattern used throughout this file, called out once
 * here as the reusable template: check `handoff.ownerId === session.userId`
 * explicitly, never infer it from the route/input shape — see security.md's
 * "Ownership checks are explicit, not implied by URL shape." Returns the
 * same not_found error whether the handoff doesn't exist or belongs to
 * someone else, so a crafted ID can't be used to probe for existence.
 */
export async function addDesignerNote(input: {
  handoffId: string;
  content: string;
  screenId?: string;
  componentId?: string;
}): Promise<ActionResult<{ noteId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = addDesignerNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, content, screenId, componentId } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const note = await db.designerNote.create({
    data: { handoffId, content, screenId, componentId, createdBy: session.user.id },
  });

  logger.info('handoff.note.added', { handoffId, noteId: note.id });
  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { noteId: note.id } };
}

export async function editDesignerNote(input: {
  noteId: string;
  content: string;
}): Promise<ActionResult<{ noteId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = editDesignerNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const note = await db.designerNote.findUnique({
    where: { id: parsed.data.noteId },
    include: { handoff: true },
  });

  if (!note || note.handoff.ownerId !== session.user.id) {
    return notFoundError('Note not found.');
  }

  await db.designerNote.update({ where: { id: note.id }, data: { content: parsed.data.content } });

  logger.info('handoff.note.edited', { handoffId: note.handoffId, noteId: note.id });
  revalidatePath(`/handoffs/${note.handoffId}`);

  return { ok: true, data: { noteId: note.id } };
}

/**
 * Records "this screen leads to that screen" — always designer-authored,
 * never AI-generated (see ScreenFlow's schema comment). Both screens are
 * verified to belong to the caller's own handoff, not just trusted from
 * the client, same as every other ownership check in this file.
 */
export async function createScreenFlow(input: {
  handoffId: string;
  sourceScreenId: string;
  targetScreenId: string;
  label?: string;
}): Promise<ActionResult<{ screenFlowId: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = createScreenFlowSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { handoffId, sourceScreenId, targetScreenId, label } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  const screens = await db.screen.findMany({
    where: { id: { in: [sourceScreenId, targetScreenId] }, handoffId },
    select: { id: true },
  });

  if (screens.length !== 2) {
    return notFoundError('One or both screens could not be found.');
  }

  const flow = await db.screenFlow.create({
    data: { handoffId, sourceScreenId, targetScreenId, label, createdBy: session.user.id },
  });

  logger.info('handoff.screen_flow.created', { handoffId, screenFlowId: flow.id });
  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { screenFlowId: flow.id } };
}

export async function deleteScreenFlow(screenFlowId: string): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const flow = await db.screenFlow.findUnique({ where: { id: screenFlowId } });

  if (!flow) {
    return notFoundError('Flow not found.');
  }

  const handoff = await db.handoff.findUnique({ where: { id: flow.handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Flow not found.');
  }

  await db.screenFlow.delete({ where: { id: screenFlowId } });

  logger.info('handoff.screen_flow.deleted', { handoffId: flow.handoffId, screenFlowId });
  revalidatePath(`/handoffs/${flow.handoffId}`);

  return { ok: true, data: { deleted: true } };
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

/**
 * The only way a DeveloperFlag's status ever changes — the message itself
 * is immutable once submitted (see prisma/schema.prisma's DeveloperFlag
 * comment). Only the designer who owns the handoff can transition it;
 * there is no public path that reaches this action.
 */
export async function updateDeveloperFlagStatus(
  input: unknown,
): Promise<ActionResult<{ developerFlagId: string; status: string }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const parsed = updateDeveloperFlagStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
    };
  }

  const { developerFlagId, status } = parsed.data;

  const flag = await db.developerFlag.findUnique({ where: { id: developerFlagId } });

  if (!flag) {
    return notFoundError('Flag not found.');
  }

  const handoff = await db.handoff.findUnique({ where: { id: flag.handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Flag not found.');
  }

  await db.developerFlag.update({ where: { id: developerFlagId }, data: { status } });

  logger.info('handoff.developer_flag.status_updated', { handoffId: flag.handoffId, developerFlagId, status });
  revalidatePath(`/handoffs/${flag.handoffId}`);

  return { ok: true, data: { developerFlagId, status } };
}
