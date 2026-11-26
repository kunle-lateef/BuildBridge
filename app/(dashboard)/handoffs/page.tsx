import type { Metadata } from 'next';
import Link from 'next/link';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AttentionQueue, type AttentionItem } from '@/components/dashboard/AttentionQueue';
import { HandoffGrid } from '@/components/dashboard/HandoffGrid';
import { HandoffList } from '@/components/dashboard/HandoffList';
import { HandoffToolbar, type HandoffTab } from '@/components/dashboard/HandoffToolbar';
import { CreateHandoffButton } from '@/components/handoff/CreateHandoffButton';
import { Button } from '@/components/ui/Button';
import { GitCompare } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { getRecentActivity } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPortfolioDrift } from '@/lib/drift';
import { EXAMPLE } from '@/lib/example/fixture';
import { summarizeUsage } from '@/lib/plan-limits';
import { createSignedReadUrl } from '@/lib/storage';
import type { HandoffStatus } from '@/lib/types';

import { openExampleHandoff } from './example-actions';

export const metadata: Metadata = {
  title: 'Handoffs — BuildBridge',
};

// Tabs from Figma `03 — Dashboard`. "All" means every handoff that isn't archived.
const TAB_STATUSES: { label: string; status: HandoffStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Needs review', status: 'NeedsReview' },
  { label: 'Analyzing', status: 'Analyzing' },
  { label: 'Archived', status: 'Archived' },
];

const SORT_TO_ORDER_BY: Record<string, Record<string, 'asc' | 'desc'>> = {
  name: { name: 'asc' },
  readiness: { readinessScore: 'desc' },
  updated: { updatedAt: 'desc' },
};

const ATTENTION_QUEUE_LIMIT = 8;

type HandoffsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string; q?: string; view?: string }>;
};

/**
 * The Handoffs dashboard, as in Figma `03 — Dashboard`: a tabbed table with
 * recent activity below, and "Needs your attention" plus drift on the
 * right. A brand-new account sees "Get started" instead of the table.
 * Filter, sort, search and view live in the URL.
 */
export default async function HandoffsPage({ searchParams }: HandoffsPageProps) {
  const { status, sort, q, view } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const statusFilter = TAB_STATUSES.find((tab) => tab.status === status)?.status ?? null;
  const orderBy = SORT_TO_ORDER_BY[sort ?? 'updated'] ?? SORT_TO_ORDER_BY.updated;
  const searchQuery = q?.trim();
  const isGridView = view === 'grid';
  const ownedNotArchived = { ownerId: session.user.id, status: { not: 'Archived' as const } };

  const [handoffs, statusCounts, criticalIssues, openFlags, activity, drift] = await Promise.all([
    db.handoff.findMany({
      where: {
        ownerId: session.user.id,
        status: statusFilter ?? { not: 'Archived' },
        ...(searchQuery ? { name: { contains: searchQuery, mode: 'insensitive' } } : {}),
      },
      orderBy,
      include: {
        _count: {
          select: {
            handoffIssues: { where: { status: { in: ['Open', 'InReview'] } } },
            developerFlags: { where: { status: 'Open' } },
          },
        },
      },
    }),
    db.handoff.groupBy({ by: ['status'], where: { ownerId: session.user.id }, _count: true }),
    db.handoffIssue.findMany({
      where: { handoff: ownedNotArchived, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
      select: { id: true, title: true, createdAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: ATTENTION_QUEUE_LIMIT,
    }),
    db.developerFlag.findMany({
      where: { handoff: ownedNotArchived, status: 'Open' },
      select: { id: true, kind: true, message: true, createdAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: ATTENTION_QUEUE_LIMIT,
    }),
    getRecentActivity(session.user.id, 10),
    getPortfolioDrift(session.user.id),
  ]);

  // Phones show the plan usage on the page (Figma "Handoffs — Mobile 390"),
  // since the sidebar that carries it is a drawer there.
  const [planUser, activeHandoffCount, openCriticalCounts] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { planTier: true, analysisQuota: true, analysisUsageCount: true, billingCycleStart: true },
    }),
    db.handoff.count({ where: { ...ownedNotArchived, isExample: false } }),
    // "→ Makes it ready" goes on a handoff's last open critical gap (readiness
    // formula v1: an open critical gap blocks sharing), as in the findings panel.
    db.handoffIssue.groupBy({
      by: ['handoffId'],
      where: { handoff: ownedNotArchived, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
      _count: true,
    }),
  ]);
  const usage = summarizeUsage(planUser, activeHandoffCount);
  const openCriticalsByHandoff = new Map(openCriticalCounts.map((row) => [row.handoffId, row._count]));

  const countFor = (target: HandoffStatus) => statusCounts.find((row) => row.status === target)?._count ?? 0;
  const totalCount = statusCounts.reduce((sum, row) => sum + row._count, 0);
  const tabs: HandoffTab[] = TAB_STATUSES.map((tab) => ({
    label: tab.label,
    status: tab.status,
    count: tab.status === null ? totalCount - countFor('Archived') : countFor(tab.status),
  }));

  const attentionItems: AttentionItem[] = [
    ...criticalIssues.map(
      (issue): AttentionItem => ({
        kind: 'CriticalIssue',
        id: issue.id,
        title: issue.title,
        handoffId: issue.handoff.id,
        handoffName: issue.handoff.name,
        createdAt: issue.createdAt.toISOString(),
        makesItReady: openCriticalsByHandoff.get(issue.handoff.id) === 1,
      }),
    ),
    ...openFlags.map(
      (flag): AttentionItem => ({
        kind: 'DeveloperFlag',
        flagKind: flag.kind,
        id: flag.id,
        title: flag.message,
        handoffId: flag.handoff.id,
        handoffName: flag.handoff.name,
        createdAt: flag.createdAt.toISOString(),
      }),
    ),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, ATTENTION_QUEUE_LIMIT);

  const driftHandoffCount = new Set(drift.map((finding) => finding.handoffId)).size;
  const isFirstRun = totalCount === 0;

  // Thumbnails are only signed when the grid view is actually rendered.
  const gridHandoffs = isGridView
    ? await (async () => {
        const candidateScreens = await db.screen.findMany({
          where: { handoffId: { in: handoffs.map((handoff) => handoff.id) }, asset: { processingStatus: 'Processed' } },
          orderBy: { order: 'asc' },
          include: { asset: true },
        });
        const firstScreenByHandoffId = new Map<string, (typeof candidateScreens)[number]>();
        for (const screen of candidateScreens) {
          if (!firstScreenByHandoffId.has(screen.handoffId)) firstScreenByHandoffId.set(screen.handoffId, screen);
        }
        return Promise.all(
          handoffs.map(async (handoff) => {
            const firstScreen = firstScreenByHandoffId.get(handoff.id);
            return {
              id: handoff.id,
              name: handoff.name,
              status: handoff.status,
              isExample: handoff.isExample,
              readinessScore: handoff.readinessScore,
              thumbnailUrl: firstScreen ? await createSignedReadUrl(firstScreen.asset.storageReference) : null,
            };
          }),
        );
      })()
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="m-0 text-[26px] font-semibold leading-[34px] tracking-[-0.5px] text-[--color-text-primary] sm:text-[28px] sm:leading-9 sm:tracking-normal">
          Handoffs
        </h1>
        {!isFirstRun && <CreateHandoffButton />}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
          {isFirstRun ? (
            <GetStarted />
          ) : (
            // On phones the tabs sit on the page and the rows become a card list (Figma "Handoffs — Mobile 390").
            <section className="flex flex-col gap-6 sm:block sm:gap-0 sm:overflow-hidden sm:rounded-[12px] sm:border sm:border-[--color-border] sm:bg-white">
              <HandoffToolbar
                tabs={tabs}
                currentStatus={statusFilter}
                currentSort={sort ?? 'updated'}
                currentQuery={searchQuery ?? ''}
                currentView={isGridView ? 'grid' : 'list'}
              />
              {isGridView ? (
                <div className="sm:p-4">
                  <HandoffGrid isFiltered={Boolean(statusFilter) || Boolean(searchQuery)} handoffs={gridHandoffs} />
                </div>
              ) : (
                <HandoffList
                  isFiltered={Boolean(statusFilter) || Boolean(searchQuery)}
                  handoffs={handoffs.map((handoff) => ({
                    id: handoff.id,
                    name: handoff.name,
                    status: handoff.status,
                    isExample: handoff.isExample,
                    readinessScore: handoff.readinessScore,
                    updatedAt: handoff.updatedAt.toISOString(),
                    openIssueCount: handoff._count.handoffIssues,
                    openFlagCount: handoff._count.developerFlags,
                  }))}
                />
              )}
            </section>
          )}
          {/* Phones leave the activity feed out (Figma "Handoffs — Mobile 390"). */}
          <div className="hidden sm:block">
            <ActivityFeed events={activity} />
          </div>
          <UsageCard usage={usage} />
        </div>

        {/* Phones put what needs attention first. */}
        <div className="flex flex-col gap-6 max-sm:order-first">
          <AttentionQueue items={attentionItems} />
          {driftHandoffCount > 0 && (
            <div className="flex gap-3 rounded-[12px] border border-[--color-border] bg-white px-4 py-3">
              <GitCompare aria-hidden="true" size={14} className="mt-[3px] shrink-0 text-[--color-text-secondary]" />
              <div className="flex flex-col gap-0.5 text-[14px] leading-5">
                <span className="text-[--color-text-body]">
                  {driftHandoffCount} {driftHandoffCount === 1 ? 'handoff differs' : 'handoffs differ'} from your others
                </span>
                <Link href="/insights?tab=drift" className="font-medium text-[--color-primary] underline">
                  View drift
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Plan usage for phones and tablets, where the sidebar that carries it is a
 * drawer (Figma "Handoffs — Mobile 390"). Same numbers as the sidebar card.
 */
function UsageCard({ usage }: { usage: ReturnType<typeof summarizeUsage> }) {
  return (
    <div className="flex flex-col gap-1 rounded-[8px] border border-[--color-border] bg-white px-4 py-3 text-[12px] leading-4 tracking-[0.2px] lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[14px] font-medium leading-5 tracking-normal text-[--color-text-primary]">
          {usage.used} of {usage.quota} analyses used
        </span>
        <span className="text-[--color-text-secondary]">{usage.planLabel}</span>
      </div>
      {usage.projectedOver !== null && (
        <span className="text-[--color-error]">
          On pace for about {usage.projectedOver}, over your limit. Resets {usage.resetsOn}.
        </span>
      )}
      <span className="text-[--color-text-secondary]">
        {usage.activeCount} of {usage.activeCap} active handoffs.
        {usage.activeCount >= usage.activeCap && ' Archive one to start a new handoff.'}
      </span>
    </div>
  );
}

const FIRST_STEPS =['Name it after the feature or flow', 'Upload the finished screens in order', 'Run the analysis and review'];

/**
 * Figma `03 — Dashboard` → "First run — 0": try the example (recommended),
 * or go straight to your own screens. The example's numbers come from the
 * fixture itself, so the card can't promise more than it opens.
 */
function GetStarted() {
  const findingCount = EXAMPLE.components.reduce(
    (sum, component) => sum + 1 + component.specifications.length + component.states.length,
    EXAMPLE.responsiveRules.length,
  );
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">Get started</h2>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">See how a review works first, or go straight to your own screens.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-[12px] border-[1.5px] border-[--color-primary] bg-white p-6">
        <span className="text-[12px] font-semibold uppercase leading-4 tracking-[1.5px] text-[--color-primary]">
          Recommended · about 2 minutes
        </span>
        <span className="text-[16px] font-semibold leading-6 text-[--color-text-primary]">Try it on an example</span>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">
          A real checkout handoff, already analysed. Confirm a value, correct one, answer a gap, then see exactly what the developer gets.
        </p>
        <div className="flex flex-col gap-2 rounded-[8px] border border-[--color-border] bg-[--color-background] px-3 py-3">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">{EXAMPLE.name}</span>
            <span className="text-[12px] leading-4 text-[--color-text-secondary]">
              {EXAMPLE.screens.length} screens · {findingCount} findings
            </span>
          </span>
          <span className="flex flex-wrap gap-2">
            <ProvenanceBadge provenance="Detected" />
            <ProvenanceBadge provenance="Inferred" />
            <ProvenanceBadge provenance="Suggested" />
          </span>
        </div>
        <form action={openExampleHandoff}>
          <Button type="submit">Open the example</Button>
        </form>
        <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
          Doesn’t use an analysis or a handoff slot. Only you can see it, and you can delete it any time.
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-[12px] border border-[--color-border] bg-white p-6">
        <span className="text-[12px] font-semibold uppercase leading-4 tracking-[1.5px] text-[--color-text-secondary]">
          Your screens
        </span>
        <span className="text-[16px] font-semibold leading-6 text-[--color-text-primary]">Start your own handoff</span>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {FIRST_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-[14px] leading-5 text-[--color-text-body]">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[--color-surface] text-[12px] leading-4 text-[--color-text-secondary]">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div>
          <CreateHandoffButton variant="secondary" />
        </div>
        <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
          PNG, JPG or WebP, up to 25MB each. The Free plan includes 5 analyses a month and 3 active handoffs.
        </p>
      </div>
      </div>
    </section>
  );
}
