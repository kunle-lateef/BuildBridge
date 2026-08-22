import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { BulkDecisionBar } from '@/components/review/BulkDecisionBar';
import { DecisionControls } from '@/components/review/DecisionControls';
import { Card } from '@/components/ui/Card';
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
  componentId: string | null;
  /** Both set only when this issue is anchored to a Component with a derivable pin — see lib/screenPins.ts. */
  pinScreenId?: string | null;
  pinKey?: `component:${string}`;
};

type IssuePanelProps = {
  handoffId: string;
  issues: HandoffIssueItem[];
  /** issueId -> score delta from resolving just that issue — see lib/readiness.ts's rankNextBestActions. */
  deltaById?: Record<string, number>;
};

const PROVENANCE_ORDER: ProvenanceType[] = ['Detected', 'Inferred', 'Suggested'];

/**
 * A resolved or dismissed issue is visually deprioritized, not just
 * re-labeled — moved out of the primary list into a muted secondary
 * section, per .agents/rules/design-system.md's Color semantics notes.
 */
export function IssuePanel({ handoffId, issues, deltaById }: IssuePanelProps) {
  const active = issues.filter((issue) => issue.status === 'Open' || issue.status === 'InReview');
  const settled = issues.filter((issue) => issue.status === 'Resolved' || issue.status === 'Dismissed');

  if (issues.length === 0) {
    return <p className="text-[--color-text-muted]">No issues found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {PROVENANCE_ORDER.map((provenance) => {
        const group = active.filter((issue) => issue.provenance === provenance);
        if (group.length < 2) return null;

        return (
          <BulkDecisionBar
            key={provenance}
            handoffId={handoffId}
            findingType="HandoffIssue"
            provenance={provenance}
            findingReferences={group.map((issue) => issue.id)}
            label="issue"
          />
        );
      })}

      <div className="flex flex-col gap-3">
        {active.map((issue) => (
          <IssueRow key={issue.id} issue={issue} delta={deltaById?.[issue.id]} />
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

function IssueRow({ issue, delta }: { issue: HandoffIssueItem; delta?: number }) {
  return (
    <Card id={`issue-${issue.id}`} className="flex flex-col gap-2 scroll-mt-20 p-3">
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <SeverityBadge severity={issue.severity} />
        <span className="font-medium text-[--color-text-primary]">{issue.title}</span>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <ProvenanceBadge provenance={issue.provenance} />
          <ReviewStatusBadge status={issue.status} />
          {issue.pinScreenId && issue.pinKey && (
            <FindingPinLink screenId={issue.pinScreenId} pinKey={issue.pinKey} />
          )}
          {delta !== undefined && delta > 0 && (
            <span className="font-mono text-[--color-success]">+{delta}%</span>
          )}
        </div>
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
    </Card>
  );
}
