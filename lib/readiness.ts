import type { IssueSeverity, IssueStatus, ReadinessCategory } from '@prisma/client';

import { db } from '@/lib/db';

/**
 * Bump this whenever the formula below changes. Handoff.readinessAlgorithmVersion
 * stores the version that produced its cached score, so a v1 score and a v2
 * score are never silently treated as comparable — see architecture.md's
 * Readiness Score section.
 */
export const READINESS_ALGORITHM_VERSION = 1;

const CATEGORIES: ReadinessCategory[] = [
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
  const categories = Object.fromEntries(CATEGORIES.map((category) => [category, 100])) as Record<
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
    CATEGORIES.reduce((sum, category) => sum + categories[category], 0) / CATEGORIES.length,
  );

  return { version: READINESS_ALGORITHM_VERSION, overall, hasUnresolvedCritical, categories };
}

export async function computeReadiness(handoffId: string): Promise<ReadinessResult> {
  const issues = await db.handoffIssue.findMany({
    where: { handoffId },
    select: { severity: true, category: true, status: true },
  });

  return calculateReadiness(issues);
}
