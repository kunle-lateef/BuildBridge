import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { verifyOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createSignedUploadUrl } from '@/lib/storage';
import { requestUploadUrlSchema } from '@/lib/validators/upload';

const EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Issues a signed PUT URL for direct-to-R2 upload. This is the one
 * route-handler boundary for uploads per
 * .agents/skills/api-route-scaffolder/SKILL.md's split — recording the
 * resulting DesignAsset/Screen rows once the PUT completes is a server
 * action in actions.ts, not this route.
 */
export async function POST(request: Request): Promise<Response> {
  if (!verifyOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: { code: 'forbidden', message: 'Invalid request origin.' } },
      { status: 403 },
    );
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthenticated', message: 'Sign in to continue.' } },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_input', message: 'Invalid request body.' } },
      { status: 400 },
    );
  }

  const parsed = requestUploadUrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'invalid_input', message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      },
      { status: 400 },
    );
  }

  const { handoffId, mediaType, size } = parsed.data;

  const handoff = await db.handoff.findUnique({ where: { id: handoffId } });

  if (!handoff || handoff.ownerId !== session.user.id) {
    // Same response whether the handoff doesn't exist or belongs to someone
    // else — see security.md's guidance against confirming another user's
    // resource exists.
    return NextResponse.json(
      { ok: false, error: { code: 'not_found', message: 'Handoff not found.' } },
      { status: 404 },
    );
  }

  const extension = EXTENSION_BY_MEDIA_TYPE[mediaType];
  // Random key, never the client's filename — see security.md's File
  // Uploads section.
  const storageKey = `handoffs/${handoffId}/${randomUUID()}.${extension}`;

  try {
    const uploadUrl = await createSignedUploadUrl(storageKey, mediaType);

    logger.info('upload.url_issued', { handoffId, size });

    return NextResponse.json({ ok: true, data: { uploadUrl, storageKey } }, { status: 200 });
  } catch (error) {
    logger.error('upload.url_issuance_failed', {
      handoffId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      { ok: false, error: { code: 'server_error', message: 'Could not prepare the upload.' } },
      { status: 500 },
    );
  }
}
