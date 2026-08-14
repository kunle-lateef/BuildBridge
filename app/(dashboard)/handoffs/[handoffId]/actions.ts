'use server';

import { createHash } from 'node:crypto';

import type { Handoff } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';


import { startAnalysisRun } from '@/lib/analysis';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applyDecisionToFinding, resolveFinding } from '@/lib/decisions';
import { logger } from '@/lib/logger';
import { ACTIVE_HANDOFF_CAP } from '@/lib/plan-limits';
import { rateLimit } from '@/lib/rate-limit';
import { computeReadiness } from '@/lib/readiness';
import { generateShareToken } from '@/lib/share';
import { deleteObject, getObjectBytes, putObject } from '@/lib/storage';
import type { ActionResult } from '@/lib/types';
import { recordDesignerDecisionSchema } from '@/lib/validators/decision';
import { createHandoffSchema } from '@/lib/validators/handoff';
import { addDesignerNoteSchema, editDesignerNoteSchema } from '@/lib/validators/note';
import { createShareLinkSchema, revokeShareLinkSchema } from '@/lib/validators/share';
import { ALLOWED_UPLOAD_MEDIA_TYPES, recordUploadSchema } from '@/lib/validators/upload';

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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'not_found', message: 'Finding not found.' } };
  }

  const handoff = await db.handoff.findUnique({ where: { id: finding.handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return { ok: false, error: { code: 'not_found', message: 'Finding not found.' } };
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
  const readiness = await computeReadiness(finding.handoffId);
  await db.handoff.update({
    where: { id: finding.handoffId },
    data: { readinessScore: readiness.overall, readinessAlgorithmVersion: readiness.version },
  });

  logger.info('handoff.decision.recorded', { handoffId: finding.handoffId, findingType, action });
  revalidatePath(`/handoffs/${finding.handoffId}`);

  return { ok: true, data: { decisionId } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } };
  }

  const { rawToken, tokenHash } = generateShareToken();
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const shareLink = await db.shareLink.create({
    data: { handoffId, tokenReference: tokenHash, expiresAt },
  });

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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'not_found', message: 'Share link not found.' } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
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
    return { ok: false, error: { code: 'not_found', message: 'Note not found.' } };
  }

  await db.designerNote.update({ where: { id: note.id }, data: { content: parsed.data.content } });

  logger.info('handoff.note.edited', { handoffId: note.handoffId, noteId: note.id });
  revalidatePath(`/handoffs/${note.handoffId}`);

  return { ok: true, data: { noteId: note.id } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } };
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
    return { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
  }

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } };
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
