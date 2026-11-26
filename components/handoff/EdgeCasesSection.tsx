import { FindingPinLink } from '@/components/handoff/FindingPinLink';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';
import type { IssueSeverity, IssueStatus, ProvenanceType, ReadinessCategory } from '@/lib/types';

const PHONE_VISIBLE = 1;

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
    /** The designer's answer; shown as the confirmed behavior. */
    answer?: string | null;
  }[];
};

/**
 * All flagged gaps across every readiness category, not only issues
 * literally tagged "EdgeCases" — this is the one place a developer can see
 * everything BuildBridge identified as missing or ambiguous, matching the
 * product's core "detect gaps" framing. See lib/export/markdown.ts.s
 * comment for the same kind of interpretive-split note.
 */
export function EdgeCasesSection({ issues }: EdgeCasesSectionProps) {
  if (issues.length === 0) {
    return null;
  }

  // Phones show the first gap and "Show N more gaps" (Figma "Share view —
  // Mobile 390"). A plain checkbox drives it, so this stays a server component.
  const hiddenOnPhone = issues.length - PHONE_VISIBLE;

  return (
    <section className="group/gaps flex flex-col gap-3">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Edge cases &amp; open questions
      </h2>
      <div className="flex flex-col gap-3">
        {issues.map((issue, index) => (
          <div
            key={issue.id}
            className={cn(
              'flex flex-col gap-2 rounded-[--radius-lg] border border-[--color-border] p-4',
              index >= PHONE_VISIBLE && 'max-sm:hidden max-sm:group-has-[:checked]/gaps:flex',
            )}
          >
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2">
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
            {issue.answer && (
              <p className="rounded-[8px] bg-[--color-surface] px-3 py-2 text-[--color-text-body]">
                <span className="font-medium">Designer&apos;s answer:</span> {issue.answer}
              </p>
            )}
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
      {hiddenOnPhone > 0 && (
        <label className="cursor-pointer text-[14px] font-medium leading-5 text-[--color-primary] underline sm:hidden group-has-[:checked]/gaps:hidden">
          <input type="checkbox" className="sr-only" />
          Show {hiddenOnPhone} more {hiddenOnPhone === 1 ? 'gap' : 'gaps'}
        </label>
      )}
    </section>
  );
}
