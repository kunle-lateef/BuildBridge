import { describe, expect, it } from 'vitest';

import type { DeveloperHandoffProjection } from '@/lib/share';

import { buildAssistantContextSummary } from './assistant';


const baseProjection: DeveloperHandoffProjection = {
  name: 'Checkout redesign',
  description: 'Q3 checkout flow',
  readinessScore: 87,
  readinessAlgorithmVersion: 1,
  screens: [{ id: 'screen-1', name: 'Checkout', imageUrl: 'https://example.com/a.png', analysisStatus: 'Analyzed' }],
  components: [
    {
      id: 'component-1',
      name: 'Pay button',
      type: 'Button',
      description: 'Primary CTA',
      provenance: 'Detected',
      reviewStatus: 'Confirmed',
      specifications: [
        {
          id: 'spec-1',
          category: 'Dimensions',
          property: 'height',
          value: '48',
          unit: 'px',
          provenance: 'Detected',
          reviewStatus: 'Unreviewed',
        },
      ],
      states: [
        {
          id: 'state-1',
          name: 'Disabled',
          description: 'Not confirmed by direct evidence',
          provenance: 'Suggested',
          reviewStatus: 'Unreviewed',
        },
      ],
    },
  ],
  responsiveRules: [],
  issues: [
    {
      id: 'issue-1',
      title: 'Disabled state undefined',
      description: 'Not confirmed',
      severity: 'Medium',
      category: 'InteractionStates',
      recommendation: null,
      status: 'Open',
      provenance: 'Suggested',
    },
  ],
  notes: [{ id: 'note-1', content: 'Reuse the existing button component' }],
};

describe('buildAssistantContextSummary', () => {
  it('includes the handoff name, readiness score, and every component with its provenance/review state', () => {
    const summary = buildAssistantContextSummary(baseProjection);

    expect(summary).toContain('Checkout redesign');
    expect(summary).toContain('87%');
    expect(summary).toContain('Pay button');
    expect(summary).toContain('review status: Confirmed');
    expect(summary).toContain('height: 48px [Detected, Unreviewed]');
  });

  it('marks unconfirmed states as Suggested, not as a confirmed fact — the model relies on this to know what to trust', () => {
    const summary = buildAssistantContextSummary(baseProjection);

    expect(summary).toContain('Disabled: Not confirmed by direct evidence [Suggested, Unreviewed]');
  });

  it('includes designer notes and open issues', () => {
    const summary = buildAssistantContextSummary(baseProjection);

    expect(summary).toContain('Reuse the existing button component');
    expect(summary).toContain('Disabled state undefined');
  });

  it('never leaks internal ids into the readable summary text', () => {
    const summary = buildAssistantContextSummary(baseProjection);

    expect(summary).not.toContain('component-1');
    expect(summary).not.toContain('spec-1');
    expect(summary).not.toContain('issue-1');
  });
});
