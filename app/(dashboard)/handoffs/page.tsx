import type { Metadata } from 'next';

import { HandoffList } from '@/components/dashboard/HandoffList';
import { HandoffStatusFilter } from '@/components/dashboard/HandoffStatusFilter';
import { CreateHandoffForm } from '@/components/handoff/CreateHandoffForm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
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

type HandoffsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string }>;
};

/**
 * Single-column, sortable/filterable per design-system.md's Dashboard
 * Layout — replaces Phase P0a's bare list. Filter/sort state lives in URL
 * search params, read here and applied server-side, so the page stays
 * server-rendered.
 */
export default async function HandoffsPage({ searchParams }: HandoffsPageProps) {
  const { status, sort } = await searchParams;
  const session = await auth();

  const statusFilter =
    status && VALID_STATUSES.includes(status as HandoffStatus) ? (status as HandoffStatus) : undefined;
  const orderBy = SORT_TO_ORDER_BY[sort ?? 'updated'] ?? SORT_TO_ORDER_BY.updated;

  const handoffs = session?.user
    ? await db.handoff.findMany({
        where: { ownerId: session.user.id, ...(statusFilter ? { status: statusFilter } : {}) },
        orderBy,
      })
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Handoffs
        </h1>
      </div>

      <CreateHandoffForm />

      <div className="flex flex-col gap-4">
        <HandoffStatusFilter currentStatus={statusFilter ?? 'All'} currentSort={sort ?? 'updated'} />
        <HandoffList
          handoffs={handoffs.map((handoff) => ({
            id: handoff.id,
            name: handoff.name,
            status: handoff.status,
            readinessScore: handoff.readinessScore,
            updatedAt: handoff.updatedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
