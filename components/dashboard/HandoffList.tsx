import { HandoffListItem } from '@/components/dashboard/HandoffListItem';
import type { HandoffStatus } from '@/lib/types';

type HandoffListProps = {
  handoffs: {
    id: string;
    name: string;
    status: HandoffStatus;
    readinessScore: number | null;
    updatedAt: string;
    openIssueCount: number;
    openFlagCount: number;
  }[];
  /** Distinguishes "nothing matches the current filter" from "you have no handoffs at all" — the two need different messages. */
  isFiltered: boolean;
};

/** Single-column default view, per design-system.md's Dashboard Layout — see HandoffGrid.tsx for the opt-in card view. */
export function HandoffList({ handoffs, isFiltered }: HandoffListProps) {
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
    <ul className="flex flex-col gap-2">
      {handoffs.map((handoff) => (
        <li key={handoff.id}>
          <HandoffListItem {...handoff} />
        </li>
      ))}
    </ul>
  );
}
