import type { PlanTier } from '@prisma/client';

/**
 * Hardcoded per the approved implementation plan (Phase 0) rather than a
 * stored field on User — the cap rarely changes and doesn't warrant a
 * schema decision. Flagged there for developer override if a
 * DB-configurable cap is preferred later. Consumed by the `createHandoff`
 * server action starting in Phase P0a.
 *
 * Per-tier analysis quota (`User.analysisQuota`) is a stored column with its
 * own Prisma-level default, not duplicated here — see prisma/schema.prisma.
 */
export const ACTIVE_HANDOFF_CAP: Record<PlanTier, number> = {
  Free: 3,
  Paid: 50,
};
