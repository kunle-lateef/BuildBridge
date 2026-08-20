import Image from 'next/image';
import Link from 'next/link';

import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import type { HandoffStatus } from '@/lib/types';

type HandoffGridProps = {
  handoffs: {
    id: string;
    name: string;
    status: HandoffStatus;
    readinessScore: number | null;
    thumbnailUrl: string | null;
  }[];
  isFiltered: boolean;
};

/**
 * Opt-in alternative to HandoffList.tsx — see design-system.md's Dashboard
 * Layout for why this is allowed as a toggle but never the default. Purely
 * a navigation surface (no per-card actions like archive), so it can stay a
 * plain grid of links rather than duplicating HandoffListItem's structure.
 */
export function HandoffGrid({ handoffs, isFiltered }: HandoffGridProps) {
  if (handoffs.length === 0) {
    return (
      <p className="text-[--color-text-secondary]">
        {isFiltered
          ? 'No handoffs match this filter.'
          : 'You haven’t created a handoff yet — use “New handoff” above to get started.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {handoffs.map((handoff) => (
        <Link
          key={handoff.id}
          href={`/handoffs/${handoff.id}`}
          className="flex flex-col gap-2 rounded-[--radius-md] border border-[--color-border] p-2 hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          <div className="relative aspect-video overflow-hidden rounded-[--radius-sm] bg-[--color-surface]">
            {handoff.thumbnailUrl ? (
              <Image
                src={handoff.thumbnailUrl}
                alt=""
                fill
                sizes="240px"
                className="object-cover object-top"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[--color-text-muted]">No screens yet</div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[--color-text-body]">{handoff.name}</span>
            <HandoffStatusBadge status={handoff.status} />
          </div>
          {handoff.readinessScore !== null && (
            <span className="font-mono text-[--color-text-secondary]">{handoff.readinessScore}%</span>
          )}
        </Link>
      ))}
    </div>
  );
}
