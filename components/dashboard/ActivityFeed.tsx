import Link from 'next/link';

import type { ActivityEvent } from '@/lib/activity';

const RUN_STATUS_LABEL: Record<string, string> = {
  Completed: 'Analysis completed',
  PartiallyCompleted: 'Analysis partially completed',
  Failed: 'Analysis failed',
  Queued: 'Analysis queued',
  Processing: 'Analysis running',
};

const DECISION_ACTION_LABEL: Record<string, string> = {
  Confirm: 'Confirmed a finding',
  Modify: 'Modified a finding',
  Reject: 'Rejected a finding',
  Override: 'Overrode a finding',
};

function describe(event: ActivityEvent): string {
  switch (event.kind) {
    case 'AnalysisFinished':
      return RUN_STATUS_LABEL[event.status] ?? 'Analysis updated';
    case 'DecisionRecorded':
      return DECISION_ACTION_LABEL[event.action] ?? 'Recorded a decision';
    case 'DeveloperFlagReceived':
      return `Developer submitted a ${event.flagKind.toLowerCase()}`;
  }
}

/**
 * Chronological stream across every handoff — analysis completions,
 * designer decisions, developer flags — sourced from lib/activity.ts.
 * Purely informational (read-only), unlike IssuePanel/BulkDecisionBar.
 */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[--color-text-secondary]">No activity yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={`${event.kind}-${event.id}`} className="flex items-baseline gap-2">
          <span className="w-16 shrink-0 text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            {new Date(event.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-[--color-text-body]">{describe(event)}</span>
          <Link
            href={`/handoffs/${event.handoffId}`}
            className="text-[--color-primary] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            {event.handoffName}
          </Link>
        </li>
      ))}
    </ul>
  );
}
