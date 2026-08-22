import { z } from 'zod';

export const createShareLinkSchema = z.object({
  handoffId: z.string().min(1),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

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

/**
 * Submitted by an anonymous, unauthenticated developer through the public
 * share-link boundary — see architecture.md's Data Flow section for why
 * this is the one scoped exception to "no public writes." findingType and
 * findingReference are both-or-neither: a flag either points at one
 * specific finding or is a general question, never a mismatched pair.
 */
export const submitDeveloperFlagSchema = z
  .object({
    kind: z.enum(['Mismatch', 'Question']),
    message: z.string().trim().min(1).max(2000),
    submittedByName: z.string().trim().min(1).max(100).optional(),
    findingType: z.enum(['Component', 'Specification', 'ComponentState', 'ResponsiveRule', 'HandoffIssue']).optional(),
    findingReference: z.string().trim().min(1).max(200).optional(),
  })
  .refine((data) => (data.findingType === undefined) === (data.findingReference === undefined), {
    message: 'findingType and findingReference must both be present or both be absent.',
  });

/**
 * Submitted by the same anonymous, unauthenticated developer boundary as
 * submitDeveloperFlagSchema, but findingType/findingReference are REQUIRED
 * here (marking nothing is meaningless), and HandoffIssue is deliberately
 * excluded — an implementation mark applies to a Component/Specification/
 * ComponentState/ResponsiveRule, not a designer-review-workflow issue.
 */
export const submitImplementationMarkSchema = z.object({
  findingType: z.enum(['Component', 'Specification', 'ComponentState', 'ResponsiveRule']),
  findingReference: z.string().trim().min(1).max(200),
  markedByName: z.string().trim().min(1).max(100).optional(),
});

export const updateDeveloperFlagStatusSchema = z.object({
  developerFlagId: z.string().min(1),
  status: z.enum(['Acknowledged', 'Resolved', 'Open']),
});
