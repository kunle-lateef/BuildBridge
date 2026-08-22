import { Card } from '@/components/ui/Card';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import type { ChangelogEntry, ChangelogIssueRef } from '@/lib/changelog';

type AnalysisChangelogPanelProps = {
  entries: ChangelogEntry[];
};

/**
 * Honestly scoped to gap-detection findings — see lib/changelog.ts. Most
 * recent run expanded by default so re-triggering analysis has an
 * immediately visible result; older runs collapse into <details>.
 */
export function AnalysisChangelogPanel({ entries }: AnalysisChangelogPanelProps) {
  if (entries.length === 0) {
    return <p className="text-[--color-text-muted]">No re-analysis history yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <details key={entry.analysisRunId} className="rounded-[--radius-lg] border border-[--color-border] p-3" open={index === 0}>
          <summary className="cursor-pointer text-[--color-text-primary]">
            {entry.runDate.toLocaleString()} — {entry.created.length} new, {entry.reaffirmed.length} still flagged,{' '}
            {entry.conflicts.length} conflict{entry.conflicts.length === 1 ? '' : 's'}
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <ChangelogGroup
              label="New"
              refs={entry.created}
              emptyLabel="No new gaps found in this run."
            />
            <ChangelogGroup
              label="Still flagged"
              refs={entry.reaffirmed}
              emptyLabel="No previously-open issues were re-confirmed."
            />
            {entry.conflicts.length > 0 && (
              <ChangelogGroup
                label="Conflicts (re-flagged after being resolved or dismissed)"
                refs={entry.conflicts}
                emptyLabel=""
              />
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function ChangelogGroup({
  label,
  refs,
  emptyLabel,
}: {
  label: string;
  refs: ChangelogIssueRef[];
  emptyLabel: string;
}) {
  if (refs.length === 0) {
    return emptyLabel ? <p className="text-[--color-text-muted]">{emptyLabel}</p> : null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[length:var(--font-desktop-caption-medium-size)] font-medium text-[--color-text-secondary]">
        {label}
      </h3>
      {refs.map((ref) => (
        <Card
          key={ref.issueId}
          className="flex flex-col items-start gap-1.5 p-2 sm:flex-row sm:items-center sm:gap-2"
        >
          <SeverityBadge severity={ref.severity} />
          <a href={`#issue-${ref.issueId}`} className="font-medium text-[--color-text-primary] hover:underline">
            {ref.title}
          </a>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <ReviewStatusBadge status={ref.status} />
            <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
              {ref.category}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
