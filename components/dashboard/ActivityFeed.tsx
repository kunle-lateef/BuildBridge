import {
  CheckCircle2,
  Clock,
  MessageSquareWarning,
  Pencil,
  ThumbsDown,
  Wand2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

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
      return `Developer submitted a ${event.flagKind.toLowerCase()}`;
  }
}

function EventIcon({ event }: { event: ActivityEvent }) {
  if (event.kind === 'AnalysisFinished') {
    if (event.status === 'Failed') {
      return <XCircle aria-hidden="true" size={16} className="text-[--color-error]" />;
    }
    if (event.status === 'Queued' || event.status === 'Processing') {
      return <Clock aria-hidden="true" size={16} className="text-[--color-text-muted]" />;
    }
    return <CheckCircle2 aria-hidden="true" size={16} className="text-[--color-success]" />;
  }

  if (event.kind === 'DecisionRecorded') {
    if (event.action === 'Reject') {
      return <ThumbsDown aria-hidden="true" size={16} className="text-[--color-error]" />;
    }
    if (event.action === 'Modify' || event.action === 'Override') {
      return <Pencil aria-hidden="true" size={16} className="text-[--color-warning]" />;
    }
    return <CheckCircle2 aria-hidden="true" size={16} className="text-[--color-success]" />;
  }

  return <MessageSquareWarning aria-hidden="true" size={16} className="text-[--color-text-muted]" />;
}

/**
 * Chronological stream across every handoff — analysis completions,
 * designer decisions, developer flags — sourced from lib/activity.ts.
 * Purely informational (read-only), unlike IssuePanel/BulkDecisionBar.
 * Renders only rows, never its own outer border — the caller (currently
 * only the handoffs list page) supplies the Card and heading it sits inside,
 * so the border can wrap both without doubling up.
 */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 text-[--color-text-secondary]">
        <Wand2 aria-hidden="true" size={16} className="text-[--color-text-muted]" />
        No activity yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {events.map((event) => (
        <div
          key={`${event.kind}-${event.id}`}
          className="flex items-center gap-3 rounded-[--radius-md] border border-[--color-border] p-3"
        >
          <EventIcon event={event} />
          <span className="flex-1 truncate text-[--color-text-body]">
            {describe(event)}{' '}
            <Link
              href={`/handoffs/${event.handoffId}`}
              className="text-[--color-primary] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              {event.handoffName}
            </Link>
          </span>
          <span className="shrink-0 text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            {formatRelativeTime(event.at)}
          </span>
        </div>
      ))}
    </div>
  );
}
