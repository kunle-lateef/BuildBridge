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
  isExample: boolean;
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
    <>
    <PhoneHandoffList handoffs={handoffs} />
    <div role="table" aria-label="Handoffs" className="hidden overflow-x-auto sm:block">
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
              <HandoffStatusBadge status={handoff.status} isExample={handoff.isExample} />
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
    </>
  );
}

/**
 * Phones (Figma "Handoffs — Mobile 390"): one card of rows, each the name
 * and readiness, then the status and a line of what's open and when.
 */
function PhoneHandoffList({ handoffs }: { handoffs: HandoffRow[] }) {
  return (
    <ul aria-label="Handoffs" className="m-0 list-none overflow-hidden rounded-[12px] border border-[--color-border] bg-white p-0 sm:hidden">
      {handoffs.map((handoff, index) => {
        const extras = [
          handoff.openFlagCount > 0 && `${handoff.openFlagCount} ${handoff.openFlagCount === 1 ? 'flag' : 'flags'}`,
          formatRelativeTime(handoff.updatedAt),
        ].filter(Boolean);
        return (
          <li
            key={handoff.id}
            className={`relative flex flex-col gap-2 px-4 py-3 active:bg-[--color-background] ${
              index < handoffs.length - 1 ? 'border-b border-[--color-border]' : ''
            }`}
          >
            <span className="flex items-center gap-2 text-[14px] font-medium leading-5">
              <Link
                href={`/handoffs/${handoff.id}`}
                className="min-w-0 flex-1 truncate text-[--color-text-primary] after:absolute after:inset-0"
              >
                {handoff.name}
              </Link>
              {handoff.readinessScore !== null && (
                <span className="shrink-0 tabular-nums text-[--color-text-secondary]">{handoff.readinessScore}%</span>
              )}
            </span>
            <span className="flex min-w-0 items-center gap-2 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
              <HandoffStatusBadge status={handoff.status} isExample={handoff.isExample} />
              <span className="truncate">
                {handoff.openIssueCount > 0 && (
                  <span className="text-[--color-error]">
                    {handoff.openIssueCount} open {handoff.openIssueCount === 1 ? 'gap' : 'gaps'}
                    {' · '}
                  </span>
                )}
                {extras.join(' · ')}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
