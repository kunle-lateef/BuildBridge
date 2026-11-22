'use server';

import { createHash } from 'node:crypto';

import { fileTypeFromBuffer } from 'file-type';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';

import { notFoundError, unauthenticatedError } from '@/lib/actionErrors';
import { startAnalysisRun } from '@/lib/analysis';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { deleteObject, getObjectBytes, putObject } from '@/lib/storage';
import type { ActionResult } from '@/lib/types';
import { ALLOWED_UPLOAD_MEDIA_TYPES, recordUploadSchema } from '@/lib/validators/upload';

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
 * Removes one screen before analysis (Figma `04 — Handoff` → "Draft — Ready
 * to analyze", the × on each row). Draft only: once a handoff has been
 * analysed its screens carry findings, so they're never removed here.
 * Deleting the asset cascades to its Screen (and that screen's flows);
 * the stored file is removed after the rows are gone.
 */
export async function deleteDraftScreen(screenId: string): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const screen = await db.screen.findUnique({
    where: { id: screenId },
    include: { handoff: { select: { id: true, ownerId: true, status: true } }, asset: true },
  });

  if (!screen || screen.handoff.ownerId !== session.user.id) {
    return notFoundError('Screen not found.');
  }

  if (screen.handoff.status !== 'Draft') {
    return {
      ok: false,
      error: { code: 'not_draft', message: 'Screens can only be removed before the first analysis.' },
    };
  }

  await db.$transaction(async (tx) => {
    await tx.designAsset.delete({ where: { id: screen.assetId } });
    const remaining = await tx.screen.findMany({
      where: { handoffId: screen.handoff.id },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    for (const [order, { id }] of remaining.entries()) {
      await tx.screen.update({ where: { id }, data: { order } });
    }
  });

  deleteObject(screen.asset.storageReference).catch((error) => {
    logger.error('upload.delete_storage_object_failed', {
      screenId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  });

  logger.info('upload.screen_removed', { handoffId: screen.handoff.id, screenId });
  revalidatePath(`/handoffs/${screen.handoff.id}`);

  return { ok: true, data: { deleted: true } };
}

/**
 * Saves a new screen order from the draft list's drag-to-reorder. The order
 * becomes the screen flow developers see. Draft only, and the list must be
 * exactly this handoff's screens, so a stale or tampered list is refused.
 */
export async function reorderDraftScreens(
  handoffId: string,
  screenIds: string[],
): Promise<ActionResult<{ reordered: true }>> {
  const session = await auth();

  if (!session?.user) {
    return unauthenticatedError();
  }

  const handoff = await db.handoff.findUnique({
    where: { id: handoffId },
    select: { ownerId: true, status: true, screens: { select: { id: true } } },
  });

  if (!handoff || handoff.ownerId !== session.user.id) {
    return notFoundError('Handoff not found.');
  }

  if (handoff.status !== 'Draft') {
    return {
      ok: false,
      error: { code: 'not_draft', message: 'Screens can only be reordered before the first analysis.' },
    };
  }

  const current = new Set(handoff.screens.map((screen) => screen.id));
  const isSameSet = screenIds.length === current.size && screenIds.every((id) => current.has(id));

  if (!isSameSet || new Set(screenIds).size !== screenIds.length) {
    return { ok: false, error: { code: 'invalid_input', message: 'The screen list has changed. Refresh and try again.' } };
  }

  await db.$transaction(screenIds.map((id, order) => db.screen.update({ where: { id }, data: { order } })));

  revalidatePath(`/handoffs/${handoffId}`);

  return { ok: true, data: { reordered: true } };
}
