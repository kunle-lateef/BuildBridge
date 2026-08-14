import { describe, expect, it } from 'vitest';

import { calculateReadiness } from './readiness';

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
