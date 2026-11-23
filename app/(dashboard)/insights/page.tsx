import type { Metadata } from 'next';
import Link from 'next/link';

import { CategoryTrendSparkline } from '@/components/dashboard/CategoryTrendSparkline';
import { PortfolioTrendChart, type TrendPoint } from '@/components/dashboard/PortfolioTrendChart';
import { GitCompare, LineChart } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { getPortfolioDrift } from '@/lib/drift';
import { getPortfolioInsights } from '@/lib/insights';
import { READINESS_CATEGORIES } from '@/lib/readiness';
import { READINESS_CATEGORY_LABEL } from '@/lib/readinessLabels';
import type { IssueSeverity } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Insights — BuildBridge',
};

const CATEGORY_LABEL = READINESS_CATEGORY_LABEL;
/** The readiness formula's "ready" line, marked on every category bar. */
const READY_THRESHOLD = 85;

const SEVERITY_ORDER: IssueSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Recommendation'];

type InsightsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

/**
 * Figma `08 — Insights`. Readiness aggregates the deterministic readiness
 * score across every non-archived handoff (lib/insights.ts). Drift (the old
 * /drift page, now a tab) compares the same property across handoffs
 * (lib/drift.ts): a read-only signal, never a finding recorded against any
 * handoff.
 */
export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const { tab } = await searchParams;
  const activeTab = tab === 'drift' ? 'drift' : 'readiness';
  const [insights, drift] = await Promise.all([getPortfolioInsights(session.user.id), getPortfolioDrift(session.user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">Insights</h1>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
          Readiness across your handoffs, by category, over the last 10 analyses.
        </p>
      </div>

      <nav aria-label="Insights" className="flex gap-6 border-b border-[--color-border]">
        <TabLink href="/insights" isActive={activeTab === 'readiness'}>Readiness</TabLink>
        <TabLink href="/insights?tab=drift" isActive={activeTab === 'drift'}>
          Drift
          {drift.length > 0 && <span className="text-[12px] font-normal text-[--color-text-secondary]">{drift.length}</span>}
        </TabLink>
      </nav>

      {activeTab === 'drift' ? <DriftTab findings={drift} /> : <ReadinessTab insights={insights} />}
    </div>
  );
}

function TabLink({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        '-mb-px flex items-center gap-2 border-b-2 pb-3 text-[14px] leading-5',
        isActive
          ? 'border-[--color-primary] font-medium text-[--color-text-primary]'
          : 'border-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]',
      )}
    >
      {children}
    </Link>
  );
}

function EmptyCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex max-w-[820px] flex-col items-center gap-2 rounded-[12px] border border-[--color-border] bg-white px-6 py-14 text-center">
      <span aria-hidden="true" className="text-[--color-text-secondary]">{icon}</span>
      <span className="text-[16px] font-medium leading-6 text-[--color-text-primary]">{title}</span>
      <span className="max-w-[520px] text-[14px] leading-5 text-[--color-text-secondary]">{body}</span>
    </div>
  );
}

function ReadinessTab({ insights }: { insights: Awaited<ReturnType<typeof getPortfolioInsights>> }) {
  const hasAnalysis = READINESS_CATEGORIES.some((category) => insights.trend[category].length > 0);

  if (insights.handoffCount === 0 || !hasAnalysis) {
    return (
      <EmptyCard
        icon={<LineChart size={20} />}
        title="No insights yet"
        body="Analyze your first handoff and readiness shows up here, by category. Trends appear once you’ve run a few analyses."
      />
    );
  }

  const sortedCategories = [...READINESS_CATEGORIES].sort(
    (a, b) => insights.categoryAverages[a] - insights.categoryAverages[b],
  );

  // One portfolio-wide line, averaged across all six categories per run.
  // Every category's series comes from the same recent-runs query in
  // lib/insights.ts, so indexing them together is safe.
  const runCount = Math.max(...READINESS_CATEGORIES.map((category) => insights.trend[category].length));
  const overallTrend: TrendPoint[] = [];
  for (let i = 0; i < runCount; i++) {
    const pointsAtIndex = READINESS_CATEGORIES.map((category) => insights.trend[category][i]).filter(
      (point): point is NonNullable<typeof point> => point !== undefined,
    );
    const first = pointsAtIndex[0];
    if (!first) continue;
    overallTrend.push({
      analysisRunId: first.analysisRunId,
      runDate: first.runDate.toString(),
      score: Math.round(pointsAtIndex.reduce((sum, point) => sum + point.score, 0) / pointsAtIndex.length),
    });
  }

  const weakest = insights.weakestCategory;
  const weakestGaps = weakest ? insights.criticalOrHighCountByCategory[weakest.category] : 0;

  return (
    <div className="flex flex-col gap-6">
      {weakest && (
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium leading-4 text-[--color-text-body]">Weakest area</span>
          <h2 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">
            {CATEGORY_LABEL[weakest.category]} · {weakest.averageScore}% average
          </h2>
          <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
            {weakestGaps > 0 &&
              `${weakestGaps} critical or high ${weakestGaps === 1 ? 'gap is' : 'gaps are'} open in this category. `}
            It has the lowest average across your handoffs.
          </p>
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-[12px] border border-[--color-border] bg-white px-6 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="m-0 text-[14px] font-medium leading-5 text-[--color-text-primary]">Average readiness</h2>
          <span className="text-[12px] leading-4 text-[--color-text-secondary]">Last {overallTrend.length} analyses</span>
        </div>
        <PortfolioTrendChart points={overallTrend} />
      </section>

      <div className="overflow-x-auto rounded-[12px] border border-[--color-border] bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="bg-[--color-background] text-[12px] leading-4 text-[--color-text-body]">
              <th scope="col" className="px-6 py-3 font-medium">Category</th>
              <th scope="col" className="px-3 py-3 font-medium">
                <span className="inline-flex items-center gap-2">
                  Average readiness
                  <span className="inline-flex items-center gap-1 font-normal text-[--color-text-secondary]">
                    <span aria-hidden="true" className="h-3 w-0.5 bg-[--color-text-primary]" />
                    {READY_THRESHOLD}% = ready
                  </span>
                </span>
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Critical or high gaps</th>
              <th scope="col" className="px-6 py-3 text-right font-medium">Last 10 analyses</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((category, index) => {
              const average = insights.categoryAverages[category];
              const gaps = insights.criticalOrHighCountByCategory[category];
              return (
                <tr key={category} className={cn('border-t border-[--color-border]', index === 0 && 'bg-[--color-background]')}>
                  <th scope="row" className={cn('px-6 py-3 text-[14px] leading-5 text-[--color-text-primary]', index === 0 ? 'font-medium' : 'font-normal')}>
                    {CATEGORY_LABEL[category]}
                  </th>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-3">
                      <span className="relative h-1.5 w-[220px] shrink-0 rounded-full bg-[--color-surface]">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-[--color-text-muted]" style={{ width: `${average}%` }} />
                        <span aria-hidden="true" className="absolute -top-1 h-3.5 w-0.5 bg-[--color-text-primary]" style={{ left: `${READY_THRESHOLD}%` }} />
                      </span>
                      <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">{average}%</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-[14px] leading-5 text-[--color-text-primary]">{gaps}</td>
                  <td className="px-6 py-3">
                    <span className="flex justify-end">
                      <CategoryTrendSparkline points={insights.trend[category]} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriftTab({ findings }: { findings: Awaited<ReturnType<typeof getPortfolioDrift>> }) {
  if (findings.length === 0) {
    return (
      <EmptyCard
        icon={<GitCompare size={20} />}
        title="No drift yet"
        body="When the same property has a different value across your handoffs, it shows up here. It needs a few handoffs with similar components."
      />
    );
  }

  const affected = new Set(findings.map((finding) => finding.handoffId)).size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">
          {findings.length} {findings.length === 1 ? 'value differs' : 'values differ'} across {affected}{' '}
          {affected === 1 ? 'handoff' : 'handoffs'}
        </h2>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
          Where a value differs from what most of your handoffs use. A read-only signal: nothing here is recorded against a handoff.
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[12px] border border-[--color-border] bg-white p-0">
        {[...findings]
          .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
          .map((finding, index) => (
            <li key={`${finding.handoffId}-${index}`} className="flex flex-col gap-1.5 border-t border-[--color-border] px-6 py-4 first:border-t-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={finding.severity} />
                <ProvenanceBadge provenance={finding.provenance} />
                <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">{finding.title}</span>
                <Link href={`/handoffs/${finding.handoffId}`} className="ml-auto text-[12px] leading-4 text-[--color-primary] underline">
                  {finding.handoffName}
                </Link>
              </div>
              <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">{finding.description}</p>
              {finding.recommendation && (
                <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">Suggestion: {finding.recommendation}</p>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}
