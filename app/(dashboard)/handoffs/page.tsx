import type { Metadata } from 'next';
import Link from 'next/link';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AttentionQueue, type AttentionItem } from '@/components/dashboard/AttentionQueue';
import { HandoffGrid } from '@/components/dashboard/HandoffGrid';
import { HandoffList } from '@/components/dashboard/HandoffList';
import { HandoffToolbar, type HandoffTab } from '@/components/dashboard/HandoffToolbar';
import { CreateHandoffButton } from '@/components/handoff/CreateHandoffButton';
import { GitCompare } from '@/components/ui/icons';
import { getRecentActivity } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPortfolioDrift } from '@/lib/drift';
import { createSignedReadUrl } from '@/lib/storage';
import type { HandoffStatus } from '@/lib/types';

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
        <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">Handoffs</h1>
        {!isFirstRun && <CreateHandoffButton />}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-8">
          {isFirstRun ? (
            <GetStarted />
          ) : (
            <section className="overflow-hidden rounded-[12px] border border-[--color-border] bg-white">
              <HandoffToolbar
                tabs={tabs}
                currentStatus={statusFilter}
                currentSort={sort ?? 'updated'}
                currentQuery={searchQuery ?? ''}
                currentView={isGridView ? 'grid' : 'list'}
              />
              {isGridView ? (
                <div className="p-4">
                  <HandoffGrid isFiltered={Boolean(statusFilter) || Boolean(searchQuery)} handoffs={gridHandoffs} />
                </div>
              ) : (
                <HandoffList
                  isFiltered={Boolean(statusFilter) || Boolean(searchQuery)}
                  handoffs={handoffs.map((handoff) => ({
                    id: handoff.id,
                    name: handoff.name,
                    status: handoff.status,
                    readinessScore: handoff.readinessScore,
                    updatedAt: handoff.updatedAt.toISOString(),
                    openIssueCount: handoff._count.handoffIssues,
                    openFlagCount: handoff._count.developerFlags,
                  }))}
                />
              )}
            </section>
          )}
          <ActivityFeed events={activity} />
        </div>

        <div className="flex flex-col gap-6">
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

const FIRST_STEPS = ['Name it after the feature or flow', 'Upload the finished screens in order', 'Run the analysis and review'];

/**
 * Figma `03 — Dashboard` → "First run — 0". Figma pairs this with a "Try it
 * on an example" card; that card waits for the example handoff flow
 * (isExample copy action and fixture), so it isn't shown yet.
 */
function GetStarted() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">Get started</h2>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">Start with your own screens.</p>
      </div>
      <div className="flex max-w-[380px] flex-col gap-4 rounded-[12px] border border-[--color-border] bg-white p-6">
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
    </section>
  );
}
