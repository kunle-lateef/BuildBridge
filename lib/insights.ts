import { Prisma, type ReadinessCategory } from '@prisma/client';

import { db } from '@/lib/db';
import { calculateReadiness, READINESS_CATEGORIES } from '@/lib/readiness';

// ---------------------------------------------------------------------------
// Cross-handoff readiness insights
//
// No competitor in this category has a deterministic score to aggregate in
// the first place — this is the roadmap's highest-priority new surface.
// Reuses computeReadiness (lib/readiness.ts) per handoff rather than
// reinventing a parallel aggregation formula, so a portfolio-level number
// can never drift from the single-handoff score it's built from.
// ---------------------------------------------------------------------------

export type CategoryTrendPoint = { analysisRunId: string; runDate: Date; score: number };

export type PortfolioInsights = {
  handoffCount: number;
  weakestCategory: { category: ReadinessCategory; averageScore: number } | null;
  categoryAverages: Record<ReadinessCategory, number>;
  criticalOrHighCountByCategory: Record<ReadinessCategory, number>;
  trend: Record<ReadinessCategory, CategoryTrendPoint[]>;
};

export async function getPortfolioInsights(userId: string, trendRunLimit = 10): Promise<PortfolioInsights> {
  const [handoffs, criticalOrHighRows, recentRuns] = await Promise.all([
    db.handoff.findMany({
      where: { ownerId: userId, status: { not: 'Archived' } },
      select: { id: true },
    }),
    db.handoffIssue.groupBy({
      by: ['category'],
      where: {
        handoff: { ownerId: userId, status: { not: 'Archived' } },
        severity: { in: ['Critical', 'High'] },
        status: { in: ['Open', 'InReview'] },
      },
      _count: true,
    }),
    db.analysisRun.findMany({
      where: {
        handoff: { ownerId: userId, status: { not: 'Archived' } },
        readinessSnapshot: { not: Prisma.DbNull },
      },
      select: { id: true, createdAt: true, readinessSnapshot: true },
      orderBy: { createdAt: 'desc' },
      take: trendRunLimit,
    }),
  ]);

  const categoryAverages = Object.fromEntries(READINESS_CATEGORIES.map((category) => [category, 0])) as Record<
    ReadinessCategory,
    number
  >;

  if (handoffs.length > 0) {
    // One query for every handoff's issues, grouped in memory, rather than
    // computeReadiness's one-query-per-handoff — calculateReadiness is the
    // same pure function either way, so this can't drift from the
    // single-handoff score.
    const allIssues = await db.handoffIssue.findMany({
      where: { handoffId: { in: handoffs.map((handoff) => handoff.id) } },
      select: { handoffId: true, severity: true, category: true, status: true },
    });
    const issuesByHandoffId = new Map<string, typeof allIssues>();
    for (const issue of allIssues) {
      const bucket = issuesByHandoffId.get(issue.handoffId);
      if (bucket) {
        bucket.push(issue);
      } else {
        issuesByHandoffId.set(issue.handoffId, [issue]);
      }
    }

    const perHandoffReadiness = handoffs.map((handoff) =>
      calculateReadiness(issuesByHandoffId.get(handoff.id) ?? []),
    );

    for (const category of READINESS_CATEGORIES) {
      const sum = perHandoffReadiness.reduce((total, readiness) => total + readiness.categories[category], 0);
      categoryAverages[category] = Math.round(sum / perHandoffReadiness.length);
    }
  }

  const criticalOrHighCountByCategory = Object.fromEntries(READINESS_CATEGORIES.map((category) => [category, 0])) as Record<
    ReadinessCategory,
    number
  >;
  for (const row of criticalOrHighRows) {
    criticalOrHighCountByCategory[row.category] = row._count;
  }

  const trend = Object.fromEntries(
    READINESS_CATEGORIES.map((category) => [category, [] as CategoryTrendPoint[]]),
  ) as Record<ReadinessCategory, CategoryTrendPoint[]>;

  // Oldest-first, so a trend line reads left-to-right chronologically.
  for (const run of [...recentRuns].reverse()) {
    const snapshot = run.readinessSnapshot as { categories?: Record<string, number> } | null;
    if (!snapshot?.categories) continue;

    for (const category of READINESS_CATEGORIES) {
      const score = snapshot.categories[category];
      if (typeof score === 'number') {
        trend[category].push({ analysisRunId: run.id, runDate: run.createdAt, score });
      }
    }
  }

  const weakestCategory = READINESS_CATEGORIES.reduce<{ category: ReadinessCategory; averageScore: number } | null>(
    (weakest, category) => {
      const averageScore = categoryAverages[category];
      if (!weakest || averageScore < weakest.averageScore) {
        return { category, averageScore };
      }
      return weakest;
    },
    null,
  );

  return {
    handoffCount: handoffs.length,
    weakestCategory: handoffs.length > 0 ? weakestCategory : null,
    categoryAverages,
    criticalOrHighCountByCategory,
    trend,
  };
}
