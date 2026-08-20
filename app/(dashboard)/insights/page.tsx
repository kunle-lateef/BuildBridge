import { AlertOctagon, LineChart, TrendingDown } from 'lucide-react';
import type { Metadata } from 'next';

import { CategoryTrendSparkline } from '@/components/dashboard/CategoryTrendSparkline';
import { PortfolioTrendChart, type TrendPoint } from '@/components/dashboard/PortfolioTrendChart';
import { Card } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { getPortfolioInsights } from '@/lib/insights';
import { READINESS_CATEGORIES } from '@/lib/readiness';

export const metadata: Metadata = {
  title: 'Insights — BuildBridge',
};

const CATEGORY_LABEL: Record<string, string> = {
  VisualSpecifications: 'Visual specifications',
  Components: 'Components',
  ResponsiveBehavior: 'Responsive behavior',
  InteractionStates: 'Interaction states',
  EdgeCases: 'Edge cases',
  Accessibility: 'Accessibility',
};

/** Same thresholds a designer already reasons about via the readiness hard-gate — not a new scale, just applied to a number that had none before. */
function scoreColorClass(score: number): string {
  if (score < 60) return 'text-[--color-error]';
  if (score < 85) return 'text-[--color-warning]';
  return 'text-[--color-success]';
}

/**
 * Aggregates the deterministic readiness score across every non-Archived
 * handoff — see lib/insights.ts. This is the roadmap's highest-priority new
 * page: no fuzzy-AI competitor has a deterministic score to aggregate in
 * the first place.
 */
export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const insights = await getPortfolioInsights(session.user.id);

  if (insights.handoffCount === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="flex items-center gap-3 text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          <LineChart aria-hidden="true" size={26} className="text-[--color-primary]" />
          Insights
        </h1>
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <LineChart aria-hidden="true" size={32} className="text-[--color-text-muted]" />
          <p className="text-[--color-text-secondary]">Create and analyze a handoff to see readiness trends across your work.</p>
        </Card>
      </div>
    );
  }

  const sortedCategories = [...READINESS_CATEGORIES].sort(
    (a, b) => insights.categoryAverages[a] - insights.categoryAverages[b],
  );

  // A single portfolio-wide trend, averaged across all 6 categories per
  // run — the per-category trends already share the same underlying
  // AnalysisRun set (lib/insights.ts builds every category's series from
  // the same recent-runs query), so indexing them together is safe.
  const runCount = Math.max(...READINESS_CATEGORIES.map((category) => insights.trend[category].length));
  const overallTrend: TrendPoint[] = [];
  for (let i = 0; i < runCount; i++) {
    const pointsAtIndex = READINESS_CATEGORIES.map((category) => insights.trend[category][i]).filter(
      (point): point is NonNullable<typeof point> => point !== undefined,
    );
    if (pointsAtIndex.length === 0) continue;
    const first = pointsAtIndex[0];
    if (!first) continue;
    overallTrend.push({
      analysisRunId: first.analysisRunId,
      runDate: first.runDate.toString(),
      score: Math.round(pointsAtIndex.reduce((sum, point) => sum + point.score, 0) / pointsAtIndex.length),
    });
  }
  const currentOverallScore = overallTrend[overallTrend.length - 1]?.score ?? null;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="flex items-center gap-3 text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
        <LineChart aria-hidden="true" size={26} className="text-[--color-primary]" />
        Insights
      </h1>

      <Card className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[--color-text-secondary]">Portfolio readiness, averaged across {insights.handoffCount} handoffs</span>
            {currentOverallScore !== null && (
              <span className={cn('font-mono text-[length:var(--font-desktop-heading-1-bold-size)] font-bold', scoreColorClass(currentOverallScore))}>
                {currentOverallScore}%
              </span>
            )}
          </div>
        </div>
        <PortfolioTrendChart points={overallTrend} />
      </Card>

      {insights.weakestCategory && (
        <Card className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[--radius-lg] bg-[--color-warning-light]">
            <TrendingDown aria-hidden="true" size={22} className="text-[--color-warning]" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[--color-text-secondary]">Weakest category across {insights.handoffCount} handoffs</span>
            <span className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
              {CATEGORY_LABEL[insights.weakestCategory.category]} — {insights.weakestCategory.averageScore}% average
            </span>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {sortedCategories.map((category) => {
          const criticalOrHigh = insights.criticalOrHighCountByCategory[category];

          return (
            <Card key={category} className="flex flex-wrap items-center gap-4">
              <span className="w-48 shrink-0 text-[--color-text-body]">{CATEGORY_LABEL[category]}</span>
              <span className={cn('w-16 shrink-0 font-mono text-[length:var(--font-desktop-heading-4-semi-bold-size)] font-semibold', scoreColorClass(insights.categoryAverages[category]))}>
                {insights.categoryAverages[category]}%
              </span>
              <span
                className={cn(
                  'flex w-36 shrink-0 items-center gap-1.5',
                  criticalOrHigh > 0 ? 'text-[--color-error]' : 'text-[--color-text-muted]',
                )}
              >
                {criticalOrHigh > 0 && <AlertOctagon aria-hidden="true" size={14} />}
                {criticalOrHigh} open Critical/High
              </span>
              <CategoryTrendSparkline points={insights.trend[category]} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
