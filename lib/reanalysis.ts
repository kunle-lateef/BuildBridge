import type { ChangelogEntry, ChangelogIssueRef } from '@/lib/changelog';
import type { LatestDecision } from '@/lib/latestDecisions';

// Client-safe shapes (mirrors components/review/ReanalysisChanges.tsx).
type ChangeRef = Pick<ChangelogIssueRef, 'title' | 'severity'> & { id: string };
type Previous = { action: 'Reject' | 'Override'; label: string; decidedAt: string; answer: string | null } | null;

export type ReanalysisSummaryData = {
  runAt: string;
  isToday: boolean;
  changedCount: number;
  conflicts: (ChangeRef & { previous: Previous })[];
  newGaps: ChangeRef[];
  stillFlagged: ChangeRef[];
};

const isOpen = (ref: ChangelogIssueRef) => ref.status === 'Open' || ref.status === 'InReview';
const toRef = (ref: ChangelogIssueRef): ChangeRef => ({ id: ref.issueId, title: ref.title, severity: ref.severity });

/**
 * What the Review tab's "Re-analysis changed N findings" notice shows, or
 * null when there's nothing to show (Figma `04 — Handoff / Review changes`).
 *
 * - Only for the newest run, and only when it was a re-analysis (there's an
 *   earlier run in the changelog).
 * - A conflict still needs the designer until they make any decision on that
 *   gap after this run; a new gap until it's no longer open.
 * - Once neither is left, the notice goes away; History keeps the record.
 */
export function buildReanalysisSummary(input: {
  entries: ChangelogEntry[];
  latestRunId: string | null;
  gapDecisions: Map<string, LatestDecision>;
  gapAnswers: Map<string, string>;
  now?: Date;
}): ReanalysisSummaryData | null {
  const [entry] = input.entries;
  if (!entry || input.entries.length < 2 || entry.analysisRunId !== input.latestRunId) return null;

  const runAt = new Date(entry.runDate);
  const conflicts = entry.conflicts
    .filter((ref) => {
      const decision = input.gapDecisions.get(ref.issueId);
      return !decision || decision.createdAt < runAt;
    })
    .map((ref) => {
      const decision = input.gapDecisions.get(ref.issueId);
      const previous: Previous =
        decision?.action === 'Reject'
          ? { action: 'Reject', label: 'Not a gap', decidedAt: decision.createdAt.toISOString(), answer: null }
          : decision?.action === 'Override'
            ? { action: 'Override', label: 'Answered', decidedAt: decision.createdAt.toISOString(), answer: input.gapAnswers.get(ref.issueId) ?? null }
            : null;
      return { ...toRef(ref), previous };
    });
  const newGaps = entry.created.filter(isOpen).map(toRef);

  if (conflicts.length === 0 && newGaps.length === 0) return null;

  const now = input.now ?? new Date();
  return {
    runAt: runAt.toISOString(),
    isToday: runAt.toDateString() === now.toDateString(),
    changedCount: entry.created.length + entry.conflicts.length,
    conflicts,
    newGaps,
    stillFlagged: entry.reaffirmed.filter(isOpen).map(toRef),
  };
}
