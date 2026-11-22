import Link from 'next/link';

import { HandoffActionsMenu } from '@/components/handoff/HandoffActionsMenu';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { AlertTriangle, Flag } from '@/components/ui/icons';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { HandoffStatus } from '@/lib/types';

type HandoffRow = {
  id: string;
  name: string;
  status: HandoffStatus;
  readinessScore: number | null;
  updatedAt: string;
  openIssueCount: number;
  openFlagCount: number;
};

type HandoffListProps = {
  handoffs: HandoffRow[];
  /** Distinguishes "nothing matches the current filter" from "you have no handoffs at all". */
  isFiltered: boolean;
};

const COLUMNS = 'grid-cols-[minmax(0,1fr)_112px_96px_64px_64px_96px]';

/** The handoff table, as in Figma `03 — Dashboard` → "Handoffs — Desktop 1440". */
export function HandoffList({ handoffs, isFiltered }: HandoffListProps) {
  if (handoffs.length === 0) {
    return (
      <p className="m-0 px-4 py-6 text-[14px] leading-5 text-[--color-text-secondary]">
        {isFiltered ? 'No handoffs match this filter.' : 'No handoffs yet.'}
      </p>
    );
  }

  return (
    <div role="table" aria-label="Handoffs" className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div
          role="row"
          className={`grid ${COLUMNS} gap-4 border-b border-[--color-border] bg-[--color-background] px-4 py-2 text-[12px] font-medium leading-4 text-[--color-text-secondary]`}
        >
          <span role="columnheader">Name</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Readiness</span>
          <span role="columnheader">Open gaps</span>
          <span role="columnheader">Flags</span>
          <span role="columnheader" className="text-right">
            Updated
          </span>
        </div>
        {handoffs.map((handoff, index) => (
          <div
            key={handoff.id}
            role="row"
            className={`group relative grid ${COLUMNS} items-center gap-4 px-4 py-3 text-[14px] leading-5 hover:bg-[--color-background] ${
              index < handoffs.length - 1 ? 'border-b border-[--color-border]' : ''
            }`}
          >
            <span role="cell" className="min-w-0">
              <Link
                href={`/handoffs/${handoff.id}`}
                className="block truncate font-medium text-[--color-text-primary] after:absolute after:inset-0"
              >
                {handoff.name}
              </Link>
            </span>
            <span role="cell">
              <HandoffStatusBadge status={handoff.status} />
            </span>
            <span role="cell" className="flex items-center gap-2">
              {handoff.readinessScore !== null ? (
                <>
                  <span className="h-1 w-5 overflow-hidden rounded-full bg-[--color-surface]">
                    <span className="block h-full w-full rounded-full bg-[--color-text-secondary]" />
                  </span>
                  <span className="text-[--color-text-primary] tabular-nums">{handoff.readinessScore}%</span>
                </>
              ) : (
                <span className="text-[--color-text-dismissed]">—</span>
              )}
            </span>
            <span role="cell">
              {handoff.openIssueCount > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-[--color-error]"
                  aria-label={`${handoff.openIssueCount} open gap${handoff.openIssueCount === 1 ? '' : 's'}`}
                >
                  <AlertTriangle aria-hidden="true" size={14} />
                  {handoff.openIssueCount}
                </span>
              )}
            </span>
            <span role="cell">
              {handoff.openFlagCount > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-[--color-text-secondary]"
                  aria-label={`${handoff.openFlagCount} open developer flag${handoff.openFlagCount === 1 ? '' : 's'}`}
                >
                  <Flag aria-hidden="true" size={14} />
                  {handoff.openFlagCount}
                </span>
              )}
            </span>
            <span role="cell" className="relative z-10 flex items-center justify-end gap-2">
              <span className="text-[12px] leading-4 text-[--color-text-secondary] group-hover:hidden group-focus-within:hidden">
                {formatRelativeTime(handoff.updatedAt)}
              </span>
              <span className="hidden group-hover:block group-focus-within:block">
                <HandoffActionsMenu handoffId={handoff.id} isArchived={handoff.status === 'Archived'} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
