import { describe, expect, it } from 'vitest';

import {
  componentDetectionResultSchema,
  gapDetectionResultSchema,
  responsiveAnalysisResultSchema,
  specificationExtractionResultSchema,
  stateAnalysisResultSchema,
} from '@/lib/ai/schemas';
import { calculateReadiness } from '@/lib/readiness';

import { EXAMPLE } from './fixture';

describe('example handoff fixture', () => {
  it('passes the analysis pipeline’s own schemas, like real AI output', () => {
    expect(
      componentDetectionResultSchema.safeParse({
        components: EXAMPLE.components.map(({ name, type, description, region, provenance, confidence }) => ({ name, type, description, region, provenance, confidence })),
      }).success,
    ).toBe(true);
    for (const component of EXAMPLE.components) {
      const specifications = component.specifications.map(({ confirmed: _confirmed, ...spec }) => spec);
      const states = component.states.map(({ confirmed: _confirmed, ...state }) => state);
      expect(specificationExtractionResultSchema.safeParse({ specifications }).success).toBe(true);
      expect(stateAnalysisResultSchema.safeParse({ states }).success).toBe(true);
    }
    expect(
      responsiveAnalysisResultSchema.safeParse({
        rules: EXAMPLE.responsiveRules.map(({ viewportCategory, behavior, provenance, confidence }) => ({ viewportCategory, behavior, provenance, confidence })),
      }).success,
    ).toBe(true);
    expect(
      gapDetectionResultSchema.safeParse({
        issues: EXAMPLE.gaps.map(({ title, description, severity, category, recommendation, provenance, confidence }) => ({ title, description, severity, category, recommendation, provenance, confidence })),
      }).success,
    ).toBe(true);
  });

  it('scores 78% through the real formula, and 85% once the critical gap is answered', () => {
    const open = EXAMPLE.gaps.map((gap) => ({ severity: gap.severity, category: gap.category, status: 'Open' as const }));
    expect(calculateReadiness(open)).toMatchObject({ overall: 78, hasUnresolvedCritical: true });

    const answered = EXAMPLE.gaps.map((gap) => ({ severity: gap.severity, category: gap.category, status: gap.severity === 'Critical' ? ('Resolved' as const) : ('Open' as const) }));
    expect(calculateReadiness(answered)).toMatchObject({ overall: 85, hasUnresolvedCritical: false });
  });

  it('has the shape Figma shows: 4 screens, 4 components, 12 findings already confirmed', () => {
    expect(EXAMPLE.screens).toHaveLength(4);
    expect(EXAMPLE.components.map((component) => [component.name, component.specifications.length, component.states.length])).toEqual([
      ['Pay button', 4, 3],
      ['Card number field', 5, 3],
      ['Expiry field', 4, 3],
      ['Order summary', 3, 1],
    ]);
    const confirmed = EXAMPLE.components.reduce(
      (sum, component) =>
        sum + (component.confirmed ? 1 : 0) + component.specifications.filter((s) => s.confirmed).length + component.states.filter((s) => s.confirmed).length,
      0,
    );
    expect(confirmed).toBe(12);
  });
});
