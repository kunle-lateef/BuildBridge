import { HandoffListItem } from '@/components/dashboard/HandoffListItem';
import type { HandoffStatus } from '@/lib/types';

type HandoffListProps = {
  handoffs: {
    id: string;
    name: string;
    status: HandoffStatus;
    readinessScore: number | null;
    updatedAt: string;
  }[];
};

/** Single-column, per design-system.md's Dashboard Layout — no multi-column dashboard for MVP. */
export function HandoffList({ handoffs }: HandoffListProps) {
  if (handoffs.length === 0) {
    return <p className="text-[--color-text-secondary]">No handoffs match this filter.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {handoffs.map((handoff) => (
        <li key={handoff.id}>
          <HandoffListItem {...handoff} />
        </li>
      ))}
    </ul>
  );
}
