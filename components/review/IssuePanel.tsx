import { DecisionControls } from '@/components/review/DecisionControls';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import type { IssueSeverity, IssueStatus, ProvenanceType, ReadinessCategory } from '@/lib/types';

export type HandoffIssueItem = {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: ReadinessCategory;
  recommendation: string | null;
  status: IssueStatus;
  provenance: ProvenanceType;
};

type IssuePanelProps = {
  issues: HandoffIssueItem[];
};

/**
 * A resolved or dismissed issue is visually deprioritized, not just
 * re-labeled — moved out of the primary list into a muted secondary
 * section, per .agents/rules/design-system.md's Color semantics notes.
 */
export function IssuePanel({ issues }: IssuePanelProps) {
  const active = issues.filter((issue) => issue.status === 'Open' || issue.status === 'InReview');
  const settled = issues.filter((issue) => issue.status === 'Resolved' || issue.status === 'Dismissed');

  if (issues.length === 0) {
    return <p className="text-[--color-text-muted]">No issues found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {active.map((issue) => (
          <IssueRow key={issue.id} issue={issue} />
        ))}
        {active.length === 0 && <p className="text-[--color-text-muted]">No open issues.</p>}
      </div>

      {settled.length > 0 && (
        <details className="rounded-[--radius-lg] border border-[--color-border] p-3">
          <summary className="cursor-pointer text-[--color-text-secondary]">
            {settled.length} resolved/dismissed issue{settled.length === 1 ? '' : 's'}
          </summary>
          <div className="mt-3 flex flex-col gap-3 opacity-70">
            {settled.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: HandoffIssueItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-[--radius-lg] border border-[--color-border] p-3">
      <div className="flex items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <span className="font-medium text-[--color-text-primary]">{issue.title}</span>
        <ProvenanceBadge provenance={issue.provenance} />
        <ReviewStatusBadge status={issue.status} />
      </div>
      <p className="text-[--color-text-secondary]">{issue.description}</p>
      {issue.recommendation && (
        <p className="text-[--color-text-secondary]">
          <span className="font-medium">Recommendation:</span> {issue.recommendation}
        </p>
      )}
      <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
        Category: {issue.category}
      </span>
      <DecisionControls findingType="HandoffIssue" findingReference={issue.id} currentValue={issue.description} />
    </div>
  );
}
