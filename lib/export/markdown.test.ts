import { describe, expect, it } from 'vitest';

import type { DeveloperHandoffProjection } from '@/lib/share';

import { buildMarkdownExport } from './markdown';

const MINIMAL_PROJECTION: DeveloperHandoffProjection = {
  name: 'Checkout Redesign',
  description: 'Revised checkout flow.',
  readinessScore: 82,
  readinessAlgorithmVersion: 1,
  screens: [],
  components: [],
  responsiveRules: [],
  issues: [],
  notes: [],
  screenFlows: [],
  recentUpdates: [],
};

describe('buildMarkdownExport', () => {
  it('always includes the overview, even with nothing else', () => {
    const markdown = buildMarkdownExport(MINIMAL_PROJECTION);

    expect(markdown).toContain('# Checkout Redesign');
    expect(markdown).toContain('Revised checkout flow.');
    expect(markdown).toContain('**Readiness:** 82% (v1) — Ready');
  });

  it('shows the hard-gate state, not just the percentage, when a Critical issue is unresolved', () => {
    const markdown = buildMarkdownExport({
      ...MINIMAL_PROJECTION,
      issues: [
        {
          id: 'issue-1',
          componentId: null,
          title: 'Missing error state',
          description: 'No error state defined for the payment form.',
          severity: 'Critical',
          category: 'InteractionStates',
          recommendation: null,
          status: 'Open',
          provenance: 'Suggested',
          pinScreenId: null,
        },
      ],
    });

    expect(markdown).toContain('Not ready — 1 critical issue unresolved');
  });

  it('omits a section entirely when its data is empty, matching the live page components', () => {
    const markdown = buildMarkdownExport(MINIMAL_PROJECTION);

    expect(markdown).not.toContain('## Screens');
    expect(markdown).not.toContain('## Components');
    expect(markdown).not.toContain('## Specifications');
    expect(markdown).not.toContain('## Responsive behavior');
    expect(markdown).not.toContain('## Edge cases');
    expect(markdown).not.toContain('## Implementation notes');
  });

  it('splits ComponentState entries into Interactions vs States exactly like InteractionsSection/StatesSection', () => {
    const markdown = buildMarkdownExport({
      ...MINIMAL_PROJECTION,
      components: [
        {
          id: 'component-1',
          name: 'Primary Button',
          type: 'button',
          description: null,
          provenance: 'Detected',
          reviewStatus: 'Confirmed',
          isImplemented: false,
          pinScreenId: null,
          specifications: [],
          states: [
            {
              id: 'state-1',
              name: 'Hover',
              description: 'Darkens 8%',
              provenance: 'Inferred',
              reviewStatus: 'Unreviewed',
              isImplemented: false,
            },
            {
              id: 'state-2',
              name: 'Error',
              description: 'Not shown',
              provenance: 'Suggested',
              reviewStatus: 'Unreviewed',
              isImplemented: false,
            },
          ],
        },
      ],
    });

    const interactionsIndex = markdown.indexOf('## Interactions');
    const statesIndex = markdown.indexOf('## States');

    expect(interactionsIndex).toBeGreaterThan(-1);
    expect(statesIndex).toBeGreaterThan(-1);
    expect(markdown.slice(interactionsIndex, statesIndex)).toContain('Hover');
    expect(markdown.slice(interactionsIndex, statesIndex)).not.toContain('Error');
    expect(markdown.slice(statesIndex)).toContain('Error');
  });

  it('renders a specification value with its unit in a code span, tagged with provenance and review status', () => {
    const markdown = buildMarkdownExport({
      ...MINIMAL_PROJECTION,
      components: [
        {
          id: 'component-1',
          name: 'Primary Button',
          type: 'button',
          description: null,
          provenance: 'Detected',
          reviewStatus: 'Confirmed',
          isImplemented: false,
          pinScreenId: null,
          states: [],
          specifications: [
            {
              id: 'spec-1',
              category: 'Dimensions',
              property: 'Corner radius',
              value: '8',
              unit: 'px',
              provenance: 'Detected',
              reviewStatus: 'Confirmed',
              isImplemented: false,
            },
          ],
        },
      ],
    });

    expect(markdown).toContain('- Corner radius: `8 px` [Detected, Confirmed]');
  });

  it('lists screen flows under the Screens section, with the optional label', () => {
    const markdown = buildMarkdownExport({
      ...MINIMAL_PROJECTION,
      screens: [
        { id: 'screen-1', name: 'Cart', imageUrl: 'https://example.com/cart.png', analysisStatus: 'Analyzed', pins: [] },
        {
          id: 'screen-2',
          name: 'Checkout',
          imageUrl: 'https://example.com/checkout.png',
          analysisStatus: 'Analyzed',
          pins: [],
        },
      ],
      screenFlows: [{ id: 'flow-1', sourceScreenName: 'Cart', targetScreenName: 'Checkout', label: 'Tap "Checkout"' }],
    });

    expect(markdown).toContain('- Cart → Checkout — Tap "Checkout"');
  });
});
