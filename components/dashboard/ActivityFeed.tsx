import Link from 'next/link';

import { Check, Clock, Flag, Pencil, ThumbsDown, XCircle } from '@/components/ui/icons';
import type { ActivityEvent } from '@/lib/activity';
import { formatRelativeTime } from '@/lib/relativeTime';

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
      return event.flagKind === 'Mismatch' ? 'A developer flagged a mismatch' : 'A developer asked a question';
  }
}

function EventIcon({ event }: { event: ActivityEvent }) {
  if (event.kind === 'AnalysisFinished') {
    if (event.status === 'Failed') return <XCircle aria-hidden="true" size={14} className="text-[--color-error]" />;
    if (event.status === 'Queued' || event.status === 'Processing') return <Clock aria-hidden="true" size={14} />;
    return <Check aria-hidden="true" size={14} />;
  }
  if (event.kind === 'DecisionRecorded') {
    if (event.action === 'Reject') return <ThumbsDown aria-hidden="true" size={14} className="text-[--color-error]" />;
    if (event.action === 'Modify' || event.action === 'Override') return <Pencil aria-hidden="true" size={14} />;
    return <Check aria-hidden="true" size={14} />;
  }
  return <Flag aria-hidden="true" size={14} />;
}

/**
 * "Recent activity" (Figma `03 — Dashboard`): analysis runs, designer
 * decisions and developer flags across every handoff, newest first.
 */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-[--color-border] bg-white">
      <h2 className="m-0 border-b border-[--color-border] p-4 text-[14px] font-medium leading-5 text-[--color-text-primary]">
        Recent activity
      </h2>
      {events.length === 0 ? (
        <p className="m-0 px-4 py-3 text-[14px] leading-5 text-[--color-text-secondary]">No activity yet.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {events.map((event, index) => (
            <li
              key={`${event.kind}-${event.id}`}
              className={`flex items-start gap-3 px-4 py-3 ${index < events.length - 1 ? 'border-b border-[--color-border]' : ''}`}
            >
              <span className="pt-0.5 text-[--color-text-secondary]">
                <EventIcon event={event} />
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <span className="truncate text-[14px] leading-5 text-[--color-text-body]">
                  {describe(event)} ·{' '}
                  <Link href={`/handoffs/${event.handoffId}`} className="text-[--color-primary] hover:underline">
                    {event.handoffName}
                  </Link>
                </span>
                <span className="shrink-0 text-[12px] leading-4 text-[--color-text-secondary]">
                  {formatRelativeTime(event.at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
