import { describe, expect, it } from 'vitest';

import { calculateReadiness, deriveHandoffStatus, explainReadiness, rankNextBestActions } from './readiness';

describe('calculateReadiness', () => {
  it('scores a clean handoff at 100 with no unresolved critical issue', () => {
    const result = calculateReadiness([]);

    expect(result.overall).toBe(100);
    expect(result.hasUnresolvedCritical).toBe(false);
    expect(result.categories.Accessibility).toBe(100);
  });

  it('matches the worked example from the product prompt', () => {
    // Visual Specifications: 90, Components: 100, Responsive Behavior: 60,
    // Interaction States: 80, Edge Cases: 90, Accessibility: 100. NOTE: the
    // product prompt's Example 4 labels this "62%", but
    // (90+100+60+80+90+100)/6 = 86.67 -> 87 under the formula exactly as
    // specified elsewhere in the same prompt (unweighted average, rounded
    // to nearest whole percent) — the prompt's own example arithmetic
    // doesn't reconcile with its stated category scores. This test asserts
    // the mathematically correct result of the documented formula rather
    // than the inconsistent "62%" figure; flagged for the developer.
    const result = calculateReadiness([
      { severity: 'Medium', category: 'VisualSpecifications', status: 'Open' }, // -10 -> 90
      { severity: 'Critical', category: 'ResponsiveBehavior', status: 'Open' }, // -40 -> 60
      { severity: 'High', category: 'InteractionStates', status: 'Open' }, // -20 -> 80
      { severity: 'Medium', category: 'EdgeCases', status: 'Open' }, // -10 -> 90
    ]);

    expect(result.categories.VisualSpecifications).toBe(90);
    expect(result.categories.Components).toBe(100);
    expect(result.categories.ResponsiveBehavior).toBe(60);
    expect(result.categories.InteractionStates).toBe(80);
    expect(result.categories.EdgeCases).toBe(90);
    expect(result.categories.Accessibility).toBe(100);
    expect(result.overall).toBe(87);
    expect(result.hasUnresolvedCritical).toBe(true);
  });

  it('floors a category at 0 rather than going negative', () => {
    const result = calculateReadiness([
      { severity: 'Critical', category: 'Components', status: 'Open' },
      { severity: 'Critical', category: 'Components', status: 'Open' },
      { severity: 'Critical', category: 'Components', status: 'Open' },
    ]);

    expect(result.categories.Components).toBe(0);
  });

  it('ignores Resolved and Dismissed issues entirely', () => {
    const result = calculateReadiness([
      { severity: 'Critical', category: 'Accessibility', status: 'Resolved' },
      { severity: 'Critical', category: 'Accessibility', status: 'Dismissed' },
    ]);

    expect(result.categories.Accessibility).toBe(100);
    expect(result.hasUnresolvedCritical).toBe(false);
  });

  it('flags hasUnresolvedCritical independent of the numeric score', () => {
    // A single unresolved Critical in one category still only deducts 40
    // from that one category, but must still gate readiness regardless of
    // how high the resulting overall percentage is.
    const result = calculateReadiness([{ severity: 'Critical', category: 'EdgeCases', status: 'Open' }]);

    expect(result.overall).toBeGreaterThan(50);
    expect(result.hasUnresolvedCritical).toBe(true);
  });

  it('rounds the overall average to the nearest whole percent', () => {
    const result = calculateReadiness([{ severity: 'Low', category: 'Components', status: 'Open' }]);

    // 5 categories at 100 + 1 at 95 = 595 / 6 = 99.166... -> 99
    expect(result.overall).toBe(99);
  });
});

describe('deriveHandoffStatus', () => {
  it('moves Analyzing to Ready once there are no unresolved Critical issues — the moment analysis finishes', () => {
    expect(deriveHandoffStatus('Analyzing', false)).toBe('Ready');
  });

  it('moves Analyzing to NeedsReview when an unresolved Critical issue remains', () => {
    expect(deriveHandoffStatus('Analyzing', true)).toBe('NeedsReview');
  });

  it('moves NeedsReview to Ready once the last unresolved Critical issue is resolved', () => {
    expect(deriveHandoffStatus('NeedsReview', false)).toBe('Ready');
  });

  it('moves Ready back to NeedsReview if a Critical issue reappears (e.g. an unresolved conflict from re-analysis)', () => {
    expect(deriveHandoffStatus('Ready', true)).toBe('NeedsReview');
  });

  it('never touches Draft — there is no analysis to be ready from yet', () => {
    expect(deriveHandoffStatus('Draft', false)).toBe('Draft');
  });

  it('never pulls a Shared handoff back to NeedsReview/Ready, even if a later decision changes readiness', () => {
    expect(deriveHandoffStatus('Shared', true)).toBe('Shared');
    expect(deriveHandoffStatus('Shared', false)).toBe('Shared');
  });

  it('never touches an Archived handoff', () => {
    expect(deriveHandoffStatus('Archived', false)).toBe('Archived');
  });
});

describe('rankNextBestActions', () => {
  it('ranks a single Critical issue above a single High issue by delta', () => {
    const issues = [
      { id: 'crit-1', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'high-1', severity: 'High' as const, category: 'EdgeCases' as const, status: 'Open' as const },
    ];

    const ranked = rankNextBestActions(issues);

    expect(ranked[0]?.issueId).toBe('crit-1');
    expect(ranked[0]?.delta).toBeGreaterThan(ranked[1]?.delta ?? Number.POSITIVE_INFINITY);
  });

  it('marks resolvesHardGate true only for the issue that actually clears the last unresolved Critical', () => {
    const issues = [
      { id: 'crit-1', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'low-1', severity: 'Low' as const, category: 'EdgeCases' as const, status: 'Open' as const },
    ];

    const ranked = rankNextBestActions(issues);

    expect(ranked.find((action) => action.issueId === 'crit-1')?.resolvesHardGate).toBe(true);
    expect(ranked.find((action) => action.issueId === 'low-1')?.resolvesHardGate).toBe(false);
  });

  it('does not claim the hard gate clears if a second unresolved Critical remains in the same or a different category', () => {
    const issues = [
      { id: 'crit-1', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'crit-2', severity: 'Critical' as const, category: 'EdgeCases' as const, status: 'Open' as const },
    ];

    const ranked = rankNextBestActions(issues);

    expect(ranked.every((action) => action.resolvesHardGate === false)).toBe(true);
  });

  it('can honestly report delta 0 when a category stays floored at 0 even after resolving one issue — not a bug', () => {
    // Four Criticals in one category: 100 - 4*40 = -60 -> floored to 0.
    // Resolving any single one still leaves three: 100 - 3*40 = -20 -> still
    // floored to 0. The category score doesn't move, so neither does the
    // overall average — delta 0 is the honest answer, not a broken ranking.
    const issues = [
      { id: 'crit-1', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'crit-2', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'crit-3', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'crit-4', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
    ];

    const ranked = rankNextBestActions(issues);

    expect(ranked.every((action) => action.delta === 0)).toBe(true);
    // Still correctly flagged as clearing nothing on its own — hasUnresolvedCritical
    // stays true either way, since three Criticals still remain.
    expect(ranked.every((action) => action.resolvesHardGate === false)).toBe(true);
  });

  it('excludes already-Resolved/Dismissed issues from the ranking', () => {
    const issues = [
      { id: 'crit-1', severity: 'Critical' as const, category: 'Components' as const, status: 'Resolved' as const },
      { id: 'high-1', severity: 'High' as const, category: 'EdgeCases' as const, status: 'Open' as const },
    ];

    const ranked = rankNextBestActions(issues);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.issueId).toBe('high-1');
  });

  it('sorts by delta descending', () => {
    const issues = [
      { id: 'low-1', severity: 'Low' as const, category: 'EdgeCases' as const, status: 'Open' as const },
      { id: 'crit-1', severity: 'Critical' as const, category: 'Components' as const, status: 'Open' as const },
      { id: 'med-1', severity: 'Medium' as const, category: 'InteractionStates' as const, status: 'Open' as const },
    ];

    const ranked = rankNextBestActions(issues);

    const deltas = ranked.map((action) => action.delta);
    expect(deltas).toEqual([...deltas].sort((a, b) => b - a));
  });
});

describe('explainReadiness', () => {
  const open = (severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Recommendation', category: Parameters<typeof calculateReadiness>[0][number]['category']) =>
    ({ severity, category, status: 'Open' as const });

  it('reproduces the Figma example: (60 + 80 + 80 + 80 + 80 + 90) ÷ 6 = 78.3, shown as 78%', () => {
    const explanation = explainReadiness([
      open('Critical', 'EdgeCases'),
      open('High', 'VisualSpecifications'),
      open('High', 'ResponsiveBehavior'),
      open('High', 'InteractionStates'),
      open('High', 'Accessibility'),
      open('Medium', 'Components'),
    ]);

    expect(explanation.overall).toBe(78);
    expect(explanation.exactAverage).toBeCloseTo(78.33, 2);
    expect(explanation.hasUnresolvedCritical).toBe(true);
    expect(explanation.categories.map((c) => c.score)).toEqual([60, 80, 80, 80, 80, 90]);
    expect(explanation.categories[0]).toEqual({ category: 'EdgeCases', score: 60, openGaps: { Critical: 1 }, deducted: 40 });
  });

  it('always agrees with calculateReadiness, ignores closed gaps, and reports the floor at 0', () => {
    const issues = [
      open('Critical', 'Accessibility'),
      open('Critical', 'Accessibility'),
      open('Critical', 'Accessibility'),
      { severity: 'High' as const, category: 'Components' as const, status: 'Resolved' as const },
      open('Recommendation', 'Components'),
    ];
    const explanation = explainReadiness(issues);
    const accessibility = explanation.categories.find((c) => c.category === 'Accessibility');

    expect(explanation.overall).toBe(calculateReadiness(issues).overall);
    expect(accessibility).toEqual({ category: 'Accessibility', score: 0, openGaps: { Critical: 3 }, deducted: 100 });
    expect(explanation.categories.find((c) => c.category === 'Components')).toEqual({
      category: 'Components', score: 100, openGaps: { Recommendation: 1 }, deducted: 0,
    });
  });
});
