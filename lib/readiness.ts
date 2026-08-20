import type { HandoffStatus, IssueSeverity, IssueStatus, ReadinessCategory } from '@prisma/client';

import { db } from '@/lib/db';

// Analyzing/NeedsReview/Ready are the three statuses readiness recomputation
// is allowed to move a handoff between — Draft (no analysis yet), Shared,
// and Archived are left untouched, since re-analysis or a designer decision
// on an already-shared handoff shouldn't silently pull its status backward.
const REVIEW_DRIVEN_STATUSES: HandoffStatus[] = ['Analyzing', 'NeedsReview', 'Ready'];

/**
 * Derives Handoff.status from the readiness hard-gate per PRD Section 5.1's
 * flow ("9. When acceptable → status → Ready") and 7.3's gate. Applied
 * wherever readiness is recomputed (lib/ai/pipeline.ts on analysis
 * completion, recordDesignerDecision on every decision) so Ready is a real,
 * reachable state rather than a status value nothing ever sets.
 */
export function deriveHandoffStatus(
  currentStatus: HandoffStatus,
  hasUnresolvedCritical: boolean,
): HandoffStatus {
  if (!REVIEW_DRIVEN_STATUSES.includes(currentStatus)) {
    return currentStatus;
  }

  return hasUnresolvedCritical ? 'NeedsReview' : 'Ready';
}

/**
 * Bump this whenever the formula below changes. Handoff.readinessAlgorithmVersion
 * stores the version that produced its cached score, so a v1 score and a v2
 * score are never silently treated as comparable — see architecture.md's
 * Readiness Score section.
 */
export const READINESS_ALGORITHM_VERSION = 1;

export const READINESS_CATEGORIES: ReadinessCategory[] = [
  'VisualSpecifications',
  'Components',
  'ResponsiveBehavior',
  'InteractionStates',
  'EdgeCases',
  'Accessibility',
];

const SEVERITY_DEDUCTIONS: Record<IssueSeverity, number> = {
  Critical: 40,
  High: 20,
  Medium: 10,
  Low: 5,
  Recommendation: 0,
};

export type ReadinessResult = {
  version: number;
  overall: number;
  hasUnresolvedCritical: boolean;
  categories: Record<ReadinessCategory, number>;
};

type ReadinessInputIssue = {
  severity: IssueSeverity;
  category: ReadinessCategory;
  status: IssueStatus;
};

/**
 * Pure function over already-computed inputs — never a model call. Given
 * the same issues it always produces the same output, which is the entire
 * point: every score is explainable by pointing at the specific rows that
 * fed it, not by re-asking the AI. See architecture.md's Readiness Score
 * section for the full rationale.
 *
 * Each of the six categories starts at 100 and is floored at 0. The overall
 * score is the unweighted average of the six, rounded to the nearest whole
 * percent. A single unresolved Critical issue is a hard blocker regardless
 * of the numeric score — callers must surface `hasUnresolvedCritical`
 * alongside `overall`, never the percentage alone (see design-system.md's
 * ReadinessScore component spec).
 */
export function calculateReadiness(issues: ReadinessInputIssue[]): ReadinessResult {
  const categories = Object.fromEntries(READINESS_CATEGORIES.map((category) => [category, 100])) as Record<
    ReadinessCategory,
    number
  >;

  let hasUnresolvedCritical = false;

  for (const issue of issues) {
    if (issue.status === 'Resolved' || issue.status === 'Dismissed') {
      continue;
    }

    if (issue.severity === 'Critical') {
      hasUnresolvedCritical = true;
    }

    categories[issue.category] = Math.max(
      0,
      categories[issue.category] - SEVERITY_DEDUCTIONS[issue.severity],
    );
  }

  const overall = Math.round(
    READINESS_CATEGORIES.reduce((sum, category) => sum + categories[category], 0) / READINESS_CATEGORIES.length,
  );

  return { version: READINESS_ALGORITHM_VERSION, overall, hasUnresolvedCritical, categories };
}

export type NextBestAction = {
  issueId: string;
  projectedOverall: number;
  delta: number;
  resolvesHardGate: boolean;
};

/**
 * Ranks each still-open issue by how much resolving *just that one* would
 * raise the overall score — "resolving this would take you from 62% to
 * 79%." Simulates each issue individually against calculateReadiness rather
 * than mutating shared state, so results are independent of iteration
 * order. Category scores floor at 0, so a category already dragged to 0 by
 * two Criticals can show delta 0 for resolving just one of them — that's
 * correct, not a bug. Callers must never read delta 0 as "safe to ignore":
 * `resolvesHardGate` is the actual signal for whether this issue is a real
 * blocker, independent of how much the numeric delta happens to be.
 */
export function rankNextBestActions(
  issues: (ReadinessInputIssue & { id: string })[],
): NextBestAction[] {
  const baseline = calculateReadiness(issues);
  const openIssues = issues.filter((issue) => issue.status === 'Open' || issue.status === 'InReview');

  return openIssues
    .map((issue) => {
      const hypothetical = issues.map((candidate) =>
        candidate.id === issue.id ? { ...candidate, status: 'Resolved' as IssueStatus } : candidate,
      );
      const projected = calculateReadiness(hypothetical);

      return {
        issueId: issue.id,
        projectedOverall: projected.overall,
        delta: projected.overall - baseline.overall,
        resolvesHardGate: baseline.hasUnresolvedCritical && !projected.hasUnresolvedCritical,
      };
    })
    .sort((a, b) => b.delta - a.delta);
}

export async function computeReadiness(handoffId: string): Promise<ReadinessResult> {
  const issues = await db.handoffIssue.findMany({
    where: { handoffId },
    select: { severity: true, category: true, status: true },
  });

  return calculateReadiness(issues);
}

/**
 * Recomputes readiness and re-caches it on the Handoff, deriving status via
 * deriveHandoffStatus — the one shared path every caller that changes a
 * finding's status must go through, so recordDesignerDecision and
 * bulkRecordDecision (app/(dashboard)/handoffs/[handoffId]/actions.ts) can't
 * drift from each other.
 */
export async function recomputeHandoffReadiness(
  handoffId: string,
  currentStatus: HandoffStatus,
): Promise<ReadinessResult> {
  const readiness = await computeReadiness(handoffId);

  await db.handoff.update({
    where: { id: handoffId },
    data: {
      status: deriveHandoffStatus(currentStatus, readiness.hasUnresolvedCritical),
      readinessScore: readiness.overall,
      readinessAlgorithmVersion: readiness.version,
    },
  });

  return readiness;
}
