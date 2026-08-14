import Link from 'next/link';

import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import type { HandoffStatus } from '@/lib/types';

type HandoffListItemProps = {
  id: string;
  name: string;
  status: HandoffStatus;
  readinessScore: number | null;
  updatedAt: string;
};

export function HandoffListItem({ id, name, status, readinessScore, updatedAt }: HandoffListItemProps) {
  return (
    <Link
      href={`/handoffs/${id}`}
      className="flex items-center justify-between rounded-[--radius-md] border border-[--color-border] px-4 py-3 hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[--color-text-body]">{name}</span>
        <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
          Updated {new Date(updatedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {readinessScore !== null && <span className="font-mono text-[--color-text-secondary]">{readinessScore}%</span>}
        <HandoffStatusBadge status={status} />
      </div>
    </Link>
  );
}
