import { addMonths } from 'date-fns';
import { AlertTriangle, CheckCircle2, Eye, History, Layers } from 'lucide-react';
import type { Metadata } from 'next';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AttentionQueue, type AttentionItem } from '@/components/dashboard/AttentionQueue';
import { HandoffGrid } from '@/components/dashboard/HandoffGrid';
import { HandoffList } from '@/components/dashboard/HandoffList';
import { HandoffStatusFilter } from '@/components/dashboard/HandoffStatusFilter';
import { QuotaUsageDisplay } from '@/components/dashboard/QuotaUsageDisplay';
import { CreateHandoffButton } from '@/components/handoff/CreateHandoffButton';
import { Card } from '@/components/ui/Card';
import { getRecentActivity } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createSignedReadUrl } from '@/lib/storage';
import type { HandoffStatus } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Handoffs — BuildBridge',
};

const VALID_STATUSES: HandoffStatus[] = ['Draft', 'Analyzing', 'NeedsReview', 'Ready', 'Shared', 'Archived'];

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
 * Single-column-by-default, sortable/filterable/searchable, with an opt-in
 * grid view — see design-system.md's Dashboard Layout. Filter/sort/search/
 * view state all live in URL search params, read here and applied
 * server-side, so the page stays server-rendered. The attention queue and
 * activity feed are the page's "second job" — surfacing cross-handoff
 * patterns a designer can't see handoff-by-handoff, not just listing them.
 */
export default async function HandoffsPage({ searchParams }: HandoffsPageProps) {
  const { status, sort, q, view } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const statusFilter =
    status && VALID_STATUSES.includes(status as HandoffStatus) ? (status as HandoffStatus) : undefined;
  const orderBy = SORT_TO_ORDER_BY[sort ?? 'updated'] ?? SORT_TO_ORDER_BY.updated;
  const searchQuery = q?.trim();
  const isGridView = view === 'grid';
  const ownedNotArchived = { ownerId: session.user.id, status: { not: 'Archived' as const } };

  const [handoffs, statusCounts, user, criticalIssues, openFlags, activity] = await Promise.all([
    db.handoff.findMany({
      where: {
        ownerId: session.user.id,
        ...(statusFilter ? { status: statusFilter } : {}),
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
    db.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    db.handoffIssue.findMany({
      where: { handoff: ownedNotArchived, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
      select: { id: true, title: true, createdAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: ATTENTION_QUEUE_LIMIT,
    }),
    db.developerFlag.findMany({
      where: { handoff: ownedNotArchived, status: 'Open' },
      select: { id: true, message: true, createdAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: ATTENTION_QUEUE_LIMIT,
    }),
    getRecentActivity(session.user.id, 10),
  ]);

  const totalCount = statusCounts.reduce((sum, row) => sum + row._count, 0);
  const countFor = (target: HandoffStatus) => statusCounts.find((row) => row.status === target)?._count ?? 0;

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

  // Thumbnails are only worth fetching (and signing) when the grid view is
  // actually being rendered — the list view has no use for them.
  const gridHandoffs = isGridView
    ? await Promise.all(
        handoffs.map(async (handoff) => {
          const firstScreen = await db.screen.findFirst({
            where: { handoffId: handoff.id, asset: { processingStatus: 'Processed' } },
            orderBy: { order: 'asc' },
            include: { asset: true },
          });

          return {
            id: handoff.id,
            name: handoff.name,
            status: handoff.status,
            readinessScore: handoff.readinessScore,
            thumbnailUrl: firstScreen ? await createSignedReadUrl(firstScreen.asset.storageReference) : null,
          };
        }),
      )
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
            Handoffs
          </h1>
          <CreateHandoffButton />
        </div>
        <p className="text-[--color-text-secondary]">Every handoff you&apos;ve uploaded, reviewed, or shared.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Card className="sm:min-w-[140px] sm:flex-1">
          <span className="flex items-center gap-1.5 text-[--color-text-secondary]">
            <Layers aria-hidden="true" size={14} />
            Total handoffs
          </span>
          <span className="block font-mono text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
            {totalCount}
          </span>
        </Card>
        <Card className="sm:min-w-[140px] sm:flex-1">
          <span className="flex items-center gap-1.5 text-[--color-text-secondary]">
            <Eye aria-hidden="true" size={14} />
            Needs review
          </span>
          <span className="block font-mono text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
            {countFor('NeedsReview')}
          </span>
        </Card>
        <Card className="sm:min-w-[140px] sm:flex-1">
          <span className="flex items-center gap-1.5 text-[--color-text-secondary]">
            <CheckCircle2 aria-hidden="true" size={14} />
            Ready
          </span>
          <span className="block font-mono text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
            {countFor('Ready')}
          </span>
        </Card>
        <QuotaUsageDisplay
          used={user.analysisUsageCount}
          quota={user.analysisQuota}
          planTier={user.planTier}
          cycleStartsAt={user.billingCycleStart.toISOString()}
          cycleResetsAt={addMonths(user.billingCycleStart, 1).toISOString()}
          className="sm:min-w-[220px] sm:flex-1"
        />
      </div>

      <section className="flex flex-col gap-3">
        <Card className="flex flex-col overflow-hidden p-0">
          <h2 className="flex items-center gap-2 border-b border-[--color-border] p-3 text-[--color-text-primary]">
            <AlertTriangle aria-hidden="true" size={18} className="text-[--color-warning]" />
            Needs your attention
          </h2>
          <AttentionQueue items={attentionItems} />
        </Card>
      </section>

      <Card className="flex flex-col gap-4">
        <p className="text-[--color-text-secondary]">
          {handoffs.length} {handoffs.length === 1 ? 'handoff' : 'handoffs'}
        </p>
        <HandoffStatusFilter
          currentStatus={statusFilter ?? 'All'}
          currentSort={sort ?? 'updated'}
          currentQuery={searchQuery ?? ''}
          currentView={view ?? 'list'}
        />
        {isGridView ? (
          <HandoffGrid isFiltered={Boolean(statusFilter) || Boolean(searchQuery)} handoffs={gridHandoffs} />
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
      </Card>

      <section className="flex flex-col gap-3">
        <Card className="flex flex-col overflow-hidden p-0">
          <h2 className="flex items-center gap-2 border-b border-[--color-border] p-3 text-[--color-text-primary]">
            <History aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
            Recent activity
          </h2>
          <ActivityFeed events={activity} />
        </Card>
      </section>
    </div>
  );
}
