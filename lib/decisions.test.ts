import { describe, expect, it } from 'vitest';

import { reconcileIssueFindings, type NewIssueFinding } from './decisions';

const baseFinding: NewIssueFinding = {
  title: 'Disabled state not defined',
  description: 'The button disabled state is not confirmed by direct evidence.',
  severity: 'Medium',
  category: 'InteractionStates',
  provenance: 'Suggested',
  confidence: 0.4,
};

describe('reconcileIssueFindings', () => {
  it('creates a genuinely new finding with no matching existing issue', () => {
    const result = reconcileIssueFindings([], [baseFinding]);

    expect(result.toCreate).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
  });

  it('records (not duplicates) a finding that re-confirms a still-open existing issue, as a reaffirmation', () => {
    const existing = [{ id: 'issue-1', title: baseFinding.title, category: baseFinding.category, status: 'Open' as const }];

    const result = reconcileIssueFindings(existing, [baseFinding]);

    expect(result.toCreate).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
    expect(result.reaffirmed).toHaveLength(1);
    expect(result.reaffirmed[0]?.existingIssueId).toBe('issue-1');
  });

  it('also records a reaffirmation for a still-InReview existing issue, not just Open', () => {
    const existing = [
      { id: 'issue-1', title: baseFinding.title, category: baseFinding.category, status: 'InReview' as const },
    ];

    const result = reconcileIssueFindings(existing, [baseFinding]);

    expect(result.reaffirmed).toHaveLength(1);
  });

  it('the trust-model regression case: a re-analysis conflicting with an existing designer decision never overwrites it, and is flagged instead of silently created or dropped', () => {
    // Simulates: the designer already Dismissed this issue (a
    // DesignerDecision was recorded for it), then a later AnalysisRun's
    // gap-detection stage reports the same gap again.
    const dismissedByDesigner = [
      { id: 'issue-1', title: baseFinding.title, category: baseFinding.category, status: 'Dismissed' as const },
    ];

    const result = reconcileIssueFindings(dismissedByDesigner, [baseFinding]);

    // The designer's decision is untouched: no new duplicate issue row is
    // created for the same (category, title) pair.
    expect(result.toCreate).toHaveLength(0);
    // But the conflict is not silently dropped either — it's surfaced so a
    // designer can re-review it, per AGENTS.md's Non-Negotiable #3.
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.existingIssueId).toBe('issue-1');
    expect(result.conflicts[0]?.conflictingFinding).toEqual(baseFinding);
  });

  it('flags a conflict the same way for a Resolved existing issue as for a Dismissed one', () => {
    const resolvedByDesigner = [
      { id: 'issue-2', title: baseFinding.title, category: baseFinding.category, status: 'Resolved' as const },
    ];

    const result = reconcileIssueFindings(resolvedByDesigner, [baseFinding]);

    expect(result.toCreate).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
  });

  it('matches findings by category and case-insensitive title, not by exact object identity', () => {
    const existing = [
      { id: 'issue-3', title: baseFinding.title.toUpperCase(), category: baseFinding.category, status: 'Dismissed' as const },
    ];

    const result = reconcileIssueFindings(existing, [baseFinding]);

    expect(result.conflicts).toHaveLength(1);
  });

  it('does not match findings across different categories even with the same title', () => {
    const existing = [
      { id: 'issue-4', title: baseFinding.title, category: 'Accessibility' as const, status: 'Dismissed' as const },
    ];

    const result = reconcileIssueFindings(existing, [baseFinding]);

    expect(result.toCreate).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
  });
});
