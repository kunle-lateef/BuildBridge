import { describe, expect, it } from 'vitest';

import { buildScreenPins, type ComponentInput, type HandoffIssueInput, type ResponsiveRuleInput } from './screenPins';

const screens = [
  { id: 'screen-1', order: 0 },
  { id: 'screen-2', order: 1 },
];

function component(overrides: Partial<ComponentInput> = {}): ComponentInput {
  return {
    id: 'component-1',
    name: 'Primary Button',
    provenance: 'Detected',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    instances: [],
    specifications: [],
    states: [],
    ...overrides,
  };
}

describe('buildScreenPins', () => {
  it('produces no pin for a component with no valid instance region', () => {
    const { pinsByScreen, pinScreenIdByComponentId } = buildScreenPins({
      components: [component({ instances: [{ screenId: 'screen-1', dimensions: null }] })],
      responsiveRules: [],
      issues: [],
      screens,
    });

    expect(pinsByScreen.size).toBe(0);
    expect(pinScreenIdByComponentId.size).toBe(0);
  });

  it('produces exactly one pin per screen instance, carrying every finding anchored to that component', () => {
    const comp = component({
      instances: [
        { screenId: 'screen-1', dimensions: { x: 10, y: 10, width: 100, height: 40 } },
        { screenId: 'screen-2', dimensions: { x: 20, y: 20, width: 100, height: 40 } },
      ],
      specifications: [
        { id: 'spec-1', property: 'corner-radius', value: '8', unit: 'px', provenance: 'Detected' },
        { id: 'spec-2', property: 'height', value: '48', unit: 'px', provenance: 'Detected' },
      ],
      states: [{ id: 'state-1', name: 'Hover', provenance: 'Inferred' }],
    });

    const { pinsByScreen, pinScreenIdByComponentId } = buildScreenPins({
      components: [comp],
      responsiveRules: [],
      issues: [],
      screens,
    });

    // Exactly one pin per screen the component has a valid instance on —
    // NOT one pin per finding (2 specs + 1 state would otherwise stack 3
    // extra pins at the same spot).
    expect(pinsByScreen.get('screen-1')).toHaveLength(1);
    expect(pinsByScreen.get('screen-2')).toHaveLength(1);

    const [screen1Pin] = pinsByScreen.get('screen-1') ?? [];
    expect(screen1Pin?.key).toBe('component:component-1');
    expect(screen1Pin?.region).toEqual({ x: 10, y: 10, width: 100, height: 40 });
    expect(screen1Pin?.findings.map((f) => f.findingId).sort()).toEqual(
      ['component-1', 'spec-1', 'spec-2', 'state-1'].sort(),
    );

    // The reverse lookup picks the first screen by screen.order (screen-1, order 0).
    expect(pinScreenIdByComponentId.get('component-1')).toBe('screen-1');
  });

  it('includes a ResponsiveRule/HandoffIssue only when its own screenId is unset or matches the instance screen', () => {
    const comp = component({
      instances: [{ screenId: 'screen-1', dimensions: { x: 0, y: 0, width: 50, height: 50 } }],
    });
    const responsiveRules: ResponsiveRuleInput[] = [
      { id: 'rule-screen-agnostic', componentId: 'component-1', screenId: null, behavior: 'Stacks vertically', provenance: 'Detected' },
      { id: 'rule-matching-screen', componentId: 'component-1', screenId: 'screen-1', behavior: 'Shrinks', provenance: 'Detected' },
      { id: 'rule-other-screen', componentId: 'component-1', screenId: 'screen-2', behavior: 'Hides', provenance: 'Detected' },
    ];
    const issues: HandoffIssueInput[] = [
      { id: 'issue-unrelated-component', componentId: 'other-component', screenId: null, title: 'Unrelated', provenance: 'Detected' },
    ];

    const { pinsByScreen } = buildScreenPins({ components: [comp], responsiveRules, issues, screens });
    const [pin] = pinsByScreen.get('screen-1') ?? [];
    const findingIds = pin?.findings.map((f) => f.findingId) ?? [];

    expect(findingIds).toContain('rule-screen-agnostic');
    expect(findingIds).toContain('rule-matching-screen');
    expect(findingIds).not.toContain('rule-other-screen');
    expect(findingIds).not.toContain('issue-unrelated-component');
  });

  it('numbers pins per screen deterministically by component createdAt order', () => {
    const first = component({
      id: 'component-early',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      instances: [{ screenId: 'screen-1', dimensions: { x: 0, y: 0, width: 10, height: 10 } }],
    });
    const second = component({
      id: 'component-late',
      createdAt: new Date('2026-01-02T00:00:00Z'),
      instances: [{ screenId: 'screen-1', dimensions: { x: 100, y: 100, width: 10, height: 10 } }],
    });

    // Passed in reverse order on purpose — numbering must follow createdAt, not array order.
    const { pinsByScreen } = buildScreenPins({ components: [second, first], responsiveRules: [], issues: [], screens });
    const pins = pinsByScreen.get('screen-1')!;

    expect(pins.find((p) => p.key === 'component:component-early')?.number).toBe(1);
    expect(pins.find((p) => p.key === 'component:component-late')?.number).toBe(2);
  });
});
