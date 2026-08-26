import type {
  DesignerDecisionAction,
  FindingType,
  HandoffIssue,
  IssueSeverity,
  ProvenanceType,
  ReadinessCategory,
  ReviewStatus,
} from '@prisma/client';

type PrismaTransaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Gap-detection reconciliation (stage 5 re-runs)
//
// Stage 5 is the one pipeline stage that legitimately re-runs on every
// AnalysisRun against the handoff's full current summary (see
// architecture.md's Cost Control section). Without reconciliation, running
// it twice would either duplicate an issue the designer already has open,
// or — worse — silently resurrect one the designer already Resolved or
// Dismissed, which is exactly the "DesignerDecision silently overwritten"
// failure AGENTS.md's Non-Negotiables forbid. This is a pure function so
// it's testable without a database — see lib/readiness.ts for the same
// pattern.
// ---------------------------------------------------------------------------

export type NewIssueFinding = {
  title: string;
  description: string;
  severity: IssueSeverity;
  category: ReadinessCategory;
  recommendation?: string;
  provenance: ProvenanceType;
  confidence: number;
};

type ExistingIssue = Pick<HandoffIssue, 'id' | 'title' | 'category' | 'status'>;

type IssueReconciliation = {
  toCreate: NewIssueFinding[];
  /** Matched an existing Open/InReview issue — the AI found the same gap again, no duplicate needed. */
  reaffirmed: { existingIssueId: string; matchedFinding: NewIssueFinding }[];
  conflicts: { existingIssueId: string; conflictingFinding: NewIssueFinding }[];
};

/**
 * An incoming finding "matches" an existing issue when its category and
 * title are identical (case-insensitive) — the schema has no other shared
 * key between two independently-generated HandoffIssue rows. A match
 * against an issue still Open/InReview is a reaffirmation — no duplicate
 * created, but recorded (see persistGapDetectionFindings) so the re-analysis
 * changelog can show "still flagged" distinctly from "newly flagged." A
 * match against one the designer has already Resolved or Dismissed is a
 * conflict: the existing issue's status is never touched, and the new
 * finding is reported as a conflict rather than silently created or
 * silently dropped — see AGENTS.md's Non-Negotiable #3.
 */
export function reconcileIssueFindings(
  existingIssues: ExistingIssue[],
  newFindings: NewIssueFinding[],
): IssueReconciliation {
  const toCreate: NewIssueFinding[] = [];
  const reaffirmed: IssueReconciliation['reaffirmed'] = [];
  const conflicts: IssueReconciliation['conflicts'] = [];

  for (const finding of newFindings) {
    const match = existingIssues.find(
      (issue) =>
        issue.category === finding.category &&
        issue.title.trim().toLowerCase() === finding.title.trim().toLowerCase(),
    );

    if (!match) {
      toCreate.push(finding);
      continue;
    }

    if (match.status === 'Resolved' || match.status === 'Dismissed') {
      conflicts.push({ existingIssueId: match.id, conflictingFinding: finding });
      continue;
    }

    reaffirmed.push({ existingIssueId: match.id, matchedFinding: finding });
  }

  return { toCreate, reaffirmed, conflicts };
}

/**
 * DB-touching wrapper around reconcileIssueFindings — called from
 * lib/ai/pipeline.ts's gap-detection stage. `analysisRunId` threads through
 * to two places: the new HandoffIssue rows' sourceAnalysisRunId, and one
 * AnalysisRunFinding row per finding (Created/Reaffirmed/Conflict) — see
 * lib/changelog.ts, which reads these back for the re-analysis changelog.
 * toCreate uses individual `create()` calls rather than `createMany`
 * specifically so each new row's id is available for its AnalysisRunFinding
 * — `createMany` doesn't return created rows.
 */
export async function persistGapDetectionFindings(
  handoffId: string,
  analysisRunId: string,
  findings: NewIssueFinding[],
): Promise<{ createdCount: number; reaffirmedCount: number; conflictCount: number }> {
  const existingIssues = await db.handoffIssue.findMany({
    where: { handoffId },
    select: { id: true, title: true, category: true, status: true },
  });

  const { toCreate, reaffirmed, conflicts } = reconcileIssueFindings(existingIssues, findings);

  for (const finding of toCreate) {
    const created = await db.handoffIssue.create({
      data: { handoffId, sourceAnalysisRunId: analysisRunId, ...finding },
    });
    await db.analysisRunFinding.create({
      data: { analysisRunId, handoffIssueId: created.id, kind: 'Created' },
    });
  }

  for (const match of reaffirmed) {
    await db.analysisRunFinding.create({
      data: { analysisRunId, handoffIssueId: match.existingIssueId, kind: 'Reaffirmed' },
    });
  }

  for (const conflict of conflicts) {
    await db.analysisRunFinding.create({
      data: { analysisRunId, handoffIssueId: conflict.existingIssueId, kind: 'Conflict' },
    });
    logger.warn('decisions.conflict_detected', {
      handoffId,
      findingType: 'HandoffIssue' satisfies FindingType,
      existingIssueId: conflict.existingIssueId,
    });
  }

  return { createdCount: toCreate.length, reaffirmedCount: reaffirmed.length, conflictCount: conflicts.length };
}

// ---------------------------------------------------------------------------
// Applying a DesignerDecision to a finding
//
// Five finding types share the DesignerDecisionAction vocabulary
// (Confirm/Modify/Reject/Override) but only four of them (Component,
// Specification, ComponentState, ResponsiveRule) use ReviewStatus —
// HandoffIssue uses the distinct IssueStatus enum. The mapping below is an
// interpretive decision (neither enum has a 1:1 partner for every action —
// see the inline notes below) made in the absence of an explicit spec;
// flagged for the developer to confirm or adjust.
// ---------------------------------------------------------------------------

type FindingLookup = {
  handoffId: string;
  currentValue: string;
};

type BulkFindingRow = {
  id: string;
  handoffId: string;
  provenance: ProvenanceType;
  /** True if a designer has already acted on this finding — bulk actions skip these rather than re-deciding them. */
  isAlreadyDecided: boolean;
};

type ParentedRow = { component?: { handoffId: string } | null; screen?: { handoffId: string } | null };

/** Specification and ResponsiveRule both attach to either a Component or a Screen — never both, never neither. */
function handoffIdFromParent(row: ParentedRow): string | undefined {
  return row.component?.handoffId ?? row.screen?.handoffId;
}

/** Override has no dedicated ReviewStatus value distinct from Modify — both leave the finding "Modified"; the distinction lives in the DesignerDecision audit record's own `action` field. */
function reviewStatusFor(action: DesignerDecisionAction): ReviewStatus {
  return action === 'Confirm' ? 'Confirmed' : action === 'Reject' ? 'Rejected' : 'Modified';
}

/** Only Modify/Override ever write a new value, and never an empty one. */
function valueToApply(action: DesignerDecisionAction, newValue: string | undefined): string | undefined {
  return (action === 'Modify' || action === 'Override') && newValue ? newValue : undefined;
}

/**
 * One adapter per FindingType, covering everything that varies by type
 * across resolveFinding/applyDecisionToFinding/fetchFindingsForBulk below.
 * Keying this off `Record<FindingType, ...>` rather than three separate
 * switch statements means the compiler itself rejects a FindingType with no
 * adapter — adding a sixth finding type is a compile error here until it's
 * given one, instead of three switches that could each silently no-op or
 * return empty for a case nobody remembered to add.
 */
type FindingAdapter = {
  resolve: (findingReference: string) => Promise<FindingLookup | null>;
  applyDecision: (
    tx: PrismaTransaction,
    findingReference: string,
    action: DesignerDecisionAction,
    newValue: string | undefined,
  ) => Promise<void>;
  fetchForBulk: (findingReferences: string[]) => Promise<BulkFindingRow[]>;
};

const FINDING_ADAPTERS: Record<FindingType, FindingAdapter> = {
  Component: {
    resolve: async (id) => {
      const component = await db.component.findUnique({ where: { id } });
      return component ? { handoffId: component.handoffId, currentValue: component.description ?? '' } : null;
    },
    applyDecision: async (tx, id, action, newValue) => {
      const value = valueToApply(action, newValue);
      await tx.component.update({
        where: { id },
        data: { reviewStatus: reviewStatusFor(action), ...(value !== undefined ? { description: value } : {}) },
      });
    },
    fetchForBulk: async (ids) => {
      const rows = await db.component.findMany({ where: { id: { in: ids } } });
      return rows.map((row) => ({
        id: row.id,
        handoffId: row.handoffId,
        provenance: row.provenance,
        isAlreadyDecided: row.reviewStatus !== 'Unreviewed',
      }));
    },
  },
  Specification: {
    resolve: async (id) => {
      const spec = await db.specification.findUnique({ where: { id }, include: { component: true, screen: true } });
      if (!spec) return null;
      const handoffId = handoffIdFromParent(spec);
      return handoffId ? { handoffId, currentValue: spec.value } : null;
    },
    applyDecision: async (tx, id, action, newValue) => {
      const value = valueToApply(action, newValue);
      await tx.specification.update({
        where: { id },
        data: { reviewStatus: reviewStatusFor(action), ...(value !== undefined ? { value } : {}) },
      });
    },
    fetchForBulk: async (ids) => {
      const rows = await db.specification.findMany({
        where: { id: { in: ids } },
        include: { component: true, screen: true },
      });
      return rows.flatMap((row) => {
        const handoffId = handoffIdFromParent(row);
        return handoffId
          ? [{ id: row.id, handoffId, provenance: row.provenance, isAlreadyDecided: row.reviewStatus !== 'Unreviewed' }]
          : [];
      });
    },
  },
  ComponentState: {
    resolve: async (id) => {
      const state = await db.componentState.findUnique({ where: { id }, include: { component: true } });
      return state ? { handoffId: state.component.handoffId, currentValue: state.description ?? '' } : null;
    },
    applyDecision: async (tx, id, action, newValue) => {
      const value = valueToApply(action, newValue);
      await tx.componentState.update({
        where: { id },
        data: { reviewStatus: reviewStatusFor(action), ...(value !== undefined ? { description: value } : {}) },
      });
    },
    fetchForBulk: async (ids) => {
      const rows = await db.componentState.findMany({ where: { id: { in: ids } }, include: { component: true } });
      return rows.map((row) => ({
        id: row.id,
        handoffId: row.component.handoffId,
        provenance: row.provenance,
        isAlreadyDecided: row.reviewStatus !== 'Unreviewed',
      }));
    },
  },
  ResponsiveRule: {
    resolve: async (id) => {
      const rule = await db.responsiveRule.findUnique({ where: { id }, include: { component: true, screen: true } });
      if (!rule) return null;
      const handoffId = handoffIdFromParent(rule);
      return handoffId ? { handoffId, currentValue: rule.behavior } : null;
    },
    applyDecision: async (tx, id, action, newValue) => {
      const value = valueToApply(action, newValue);
      await tx.responsiveRule.update({
        where: { id },
        data: { reviewStatus: reviewStatusFor(action), ...(value !== undefined ? { behavior: value } : {}) },
      });
    },
    fetchForBulk: async (ids) => {
      const rows = await db.responsiveRule.findMany({
        where: { id: { in: ids } },
        include: { component: true, screen: true },
      });
      return rows.flatMap((row) => {
        const handoffId = handoffIdFromParent(row);
        return handoffId
          ? [{ id: row.id, handoffId, provenance: row.provenance, isAlreadyDecided: row.reviewStatus !== 'Unreviewed' }]
          : [];
      });
    },
  },
  HandoffIssue: {
    resolve: async (id) => {
      const issue = await db.handoffIssue.findUnique({ where: { id } });
      return issue ? { handoffId: issue.handoffId, currentValue: issue.description } : null;
    },
    // HandoffIssue uses the distinct IssueStatus enum, not ReviewStatus — see
    // the module comment above. Confirm: acknowledged as real, actively
    // tracked. Modify: edited but still open work. Reject: not actually an
    // issue. Override: the designer is asserting their own answer in place
    // of the AI's flag, closing the loop themselves.
    applyDecision: async (tx, id, action, newValue) => {
      const status = action === 'Reject' ? 'Dismissed' : action === 'Override' ? 'Resolved' : 'InReview';
      await tx.handoffIssue.update({
        where: { id },
        data: { status, ...(action === 'Modify' && newValue ? { description: newValue } : {}) },
      });
    },
    fetchForBulk: async (ids) => {
      const rows = await db.handoffIssue.findMany({ where: { id: { in: ids } } });
      return rows.map((row) => ({
        id: row.id,
        handoffId: row.handoffId,
        provenance: row.provenance,
        // Only 'Open' is the untouched starting state — InReview/Resolved/
        // Dismissed are all reachable only through a prior designer decision.
        isAlreadyDecided: row.status !== 'Open',
      }));
    },
  },
};

/**
 * Resolves a (findingType, findingReference) pair to its owning handoffId
 * and current value — the one field recordDesignerDecision's `newValue`
 * targets for that type (see FINDING_ADAPTERS for which field that is).
 * Returns null if the finding doesn't exist.
 */
export async function resolveFinding(
  findingType: FindingType,
  findingReference: string,
): Promise<FindingLookup | null> {
  return FINDING_ADAPTERS[findingType].resolve(findingReference);
}

/**
 * Applies a recorded decision to the finding it targets. Called inside the
 * same transaction as the DesignerDecision insert in actions.ts, so the
 * audit record and the finding's new state land together or not at all.
 */
export async function applyDecisionToFinding(
  tx: PrismaTransaction,
  findingType: FindingType,
  findingReference: string,
  action: DesignerDecisionAction,
  newValue: string | undefined,
): Promise<void> {
  return FINDING_ADAPTERS[findingType].applyDecision(tx, findingReference, action, newValue);
}

// ---------------------------------------------------------------------------
// Bulk decisions
//
// Confirm/Reject only, one provenance tier at a time — see AGENTS.md's
// Non-Negotiable #2. A bulk action must never be able to sweep up findings
// of a different provenance than the one the designer explicitly chose to
// bulk-act on; fetching each row's real provenance here (not trusting the
// client's claim) is what makes bulkRecordDecision's server-side check in
// actions.ts actually mean something.
// ---------------------------------------------------------------------------

/**
 * Fetches the real, current state of every requested finding, scoped by id
 * only (never trusting a client-supplied handoffId/provenance) — the caller
 * verifies handoffId/provenance match afterward. A missing row is simply
 * absent from the result, which is what lets the caller detect "some ids
 * didn't resolve" by comparing result length to the request.
 */
export async function fetchFindingsForBulk(
  findingType: FindingType,
  findingReferences: string[],
): Promise<BulkFindingRow[]> {
  return FINDING_ADAPTERS[findingType].fetchForBulk(findingReferences);
}
