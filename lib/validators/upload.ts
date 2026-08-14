import { z } from 'zod';

/**
 * PDF is named in the product prompt's supported formats but PDF→image
 * rendering (for the AI pipeline and for thumbnails) is real added
 * complexity deliberately deferred out of Phase P0a's scope — see
 * architecture.md's "never perform best-effort parsing of unsupported
 * formats" guardrail. Flagged for the developer rather than half-built.
 */
export const ALLOWED_UPLOAD_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export const requestUploadUrlSchema = z.object({
  handoffId: z.string().min(1),
  filename: z.string().trim().min(1).max(255),
  mediaType: z.enum(ALLOWED_UPLOAD_MEDIA_TYPES),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_SIZE_BYTES, 'File is larger than the 25MB limit.'),
});

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;

export const recordUploadSchema = z.object({
  handoffId: z.string().min(1),
  storageKey: z.string().min(1),
  filename: z.string().trim().min(1).max(255),
  mediaType: z.enum(ALLOWED_UPLOAD_MEDIA_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
});

export type RecordUploadInput = z.infer<typeof recordUploadSchema>;
