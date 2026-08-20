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

/**
 * Pure arithmetic projection of end-of-cycle usage from the current pace —
 * `used ÷ fraction of the cycle elapsed`. No new query: every input already
 * lives on `User` (`analysisUsageCount`, `billingCycleStart`) or is derived
 * from it (`cycleEnd = addMonths(billingCycleStart, 1)`, computed by the
 * caller). Returns `used` unprojected on day one of a cycle (elapsed
 * fraction ~0) rather than dividing by a near-zero denominator and
 * reporting a wildly inflated number from a single early data point.
 */
export function projectCycleUsage(used: number, cycleStart: Date, cycleEnd: Date, now: Date = new Date()): number {
  const totalMs = cycleEnd.getTime() - cycleStart.getTime();
  const elapsedMs = now.getTime() - cycleStart.getTime();

  if (totalMs <= 0) return used;

  const fractionElapsed = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

  // Below ~3% of the cycle elapsed (roughly the first day of a monthly
  // cycle), a single analysis run would already look like "100x pace" —
  // too noisy to act on, so just report actual usage until there's enough
  // signal to project from.
  if (fractionElapsed < 0.03) return used;

  return Math.round(used / fractionElapsed);
}
