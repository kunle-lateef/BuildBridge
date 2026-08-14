import { z } from 'zod';

export const createShareLinkSchema = z.object({
  handoffId: z.string().min(1),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;

export const revokeShareLinkSchema = z.object({
  shareLinkId: z.string().min(1),
});

/**
 * Validated as a well-formed token before it's ever used in a database
 * lookup — see .agents/skills/api-route-scaffolder/SKILL.md's Step 4. Raw
 * tokens are generated as 32 random bytes, base64url-encoded (lib/share.ts).
 */
export const shareTokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{20,64}$/, 'Malformed share link.');
