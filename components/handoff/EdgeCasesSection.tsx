import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import type { IssueSeverity, IssueStatus, ProvenanceType, ReadinessCategory } from '@/lib/types';

type EdgeCasesSectionProps = {
  issues: {
    id: string;
    componentId?: string | null;
    title: string;
    description: string;
    severity: IssueSeverity;
    category: ReadinessCategory;
    recommendation: string | null;
    status: IssueStatus;
    provenance: ProvenanceType;
    pinScreenId?: string | null;
  }[];
};

/**
 * All flagged gaps across every readiness category, not only issues
 * literally tagged "EdgeCases" — this is the one place a developer can see
 * everything BuildBridge identified as missing or ambiguous, matching the
 * product's core "detect gaps" framing. See InteractionsSection.tsx's
 * comment for the same kind of interpretive-split note.
 */
export function EdgeCasesSection({ issues }: EdgeCasesSectionProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Edge cases &amp; open questions
      </h2>
      <div className="flex flex-col gap-3">
        {issues.map((issue) => (
          <div key={issue.id} className="flex flex-col gap-2 rounded-[--radius-lg] border border-[--color-border] p-4">
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <SeverityBadge severity={issue.severity} />
              <span className="font-medium text-[--color-text-primary]">{issue.title}</span>
              <div className="flex flex-wrap items-center gap-2">
                <ProvenanceBadge provenance={issue.provenance} />
                <ReviewStatusBadge status={issue.status} />
                {issue.componentId && issue.pinScreenId && (
                  <FindingPinLink screenId={issue.pinScreenId} pinKey={`component:${issue.componentId}`} />
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
          </div>
        ))}
      </div>
    </section>
  );
}
