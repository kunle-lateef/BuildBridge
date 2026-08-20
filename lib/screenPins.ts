import { isValidRegion, type Region } from '@/lib/geometry';
import type { FindingType, ProvenanceType } from '@/lib/types';

export type PinFinding = {
  findingType: FindingType;
  findingId: string;
  label: string;
  provenance: ProvenanceType;
};

export type ScreenPin = {
  /**
   * One pin per (component, screen) instance, never per individual finding
   * — a component's specifications/states/etc. all share its one region, so
   * "one pin per finding row" would stack many identical-position pins on
   * any component with more than one spec (the common case, not an edge
   * case). `key` is what a FindingPinLink targets and what
   * ScreenPinProvider's `highlightedKey` compares against.
   */
  key: `component:${string}`;
  number: number;
  region: Region;
  /** The component's own provenance — the dot means "here's a thing I found," not a claim about any one nested finding. */
  provenance: ProvenanceType;
  findings: PinFinding[];
};

type ComponentInstanceInput = { screenId: string; dimensions: unknown };

type SpecificationInput = { id: string; property: string; value: string; unit: string | null; provenance: ProvenanceType };

type ComponentStateInput = { id: string; name: string; provenance: ProvenanceType };

export type ComponentInput = {
  id: string;
  name: string;
  provenance: ProvenanceType;
  createdAt: Date;
  instances: ComponentInstanceInput[];
  specifications: SpecificationInput[];
  states: ComponentStateInput[];
};

export type ResponsiveRuleInput = {
  id: string;
  componentId: string | null;
  screenId: string | null;
  behavior: string;
  provenance: ProvenanceType;
};

export type HandoffIssueInput = {
  id: string;
  componentId: string | null;
  screenId: string | null;
  title: string;
  provenance: ProvenanceType;
};

export type ScreenOrderInput = { id: string; order: number };

export type BuildScreenPinsResult = {
  pinsByScreen: Map<string, ScreenPin[]>;
  /** Which screen a "show on screen" link for this component should open — the first by screen order when a component has instances on several screens. */
  pinScreenIdByComponentId: Map<string, string>;
};

/**
 * Derives every screen's pins from data that's already fully persisted — no
 * AI call and no new schema needed. A Specification/ComponentState inherits
 * its parent Component's region via `componentId`; a ResponsiveRule/
 * HandoffIssue does the same but only when its own optional `screenId` is
 * either unset or matches the screen the pin is being built for (both
 * models can otherwise point at a screen-level finding with no component at
 * all, which correctly gets no pin).
 */
export function buildScreenPins({
  components,
  responsiveRules,
  issues,
  screens,
}: {
  components: ComponentInput[];
  responsiveRules: ResponsiveRuleInput[];
  issues: HandoffIssueInput[];
  screens: ScreenOrderInput[];
}): BuildScreenPinsResult {
  const screenOrderById = new Map(screens.map((screen) => [screen.id, screen.order]));
  const pinsByScreen = new Map<string, ScreenPin[]>();
  const pinScreenIdByComponentId = new Map<string, string>();

  const sortedComponents = [...components].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const component of sortedComponents) {
    const validInstances = component.instances.filter((instance) => isValidRegion(instance.dimensions));
    if (validInstances.length === 0) {
      continue;
    }

    const firstByScreenOrder = [...validInstances].sort(
      (a, b) => (screenOrderById.get(a.screenId) ?? 0) - (screenOrderById.get(b.screenId) ?? 0),
    )[0];
    if (firstByScreenOrder) {
      pinScreenIdByComponentId.set(component.id, firstByScreenOrder.screenId);
    }

    for (const instance of validInstances) {
      // isValidRegion already narrowed this above.
      const region = instance.dimensions as Region;

      const findings: PinFinding[] = [
        { findingType: 'Component', findingId: component.id, label: component.name, provenance: component.provenance },
        ...component.specifications.map(
          (spec): PinFinding => ({
            findingType: 'Specification',
            findingId: spec.id,
            label: `${spec.property}: ${spec.value}${spec.unit ?? ''}`,
            provenance: spec.provenance,
          }),
        ),
        ...component.states.map(
          (state): PinFinding => ({
            findingType: 'ComponentState',
            findingId: state.id,
            label: state.name,
            provenance: state.provenance,
          }),
        ),
        ...responsiveRules
          .filter((rule) => rule.componentId === component.id && (rule.screenId === null || rule.screenId === instance.screenId))
          .map(
            (rule): PinFinding => ({
              findingType: 'ResponsiveRule',
              findingId: rule.id,
              label: rule.behavior,
              provenance: rule.provenance,
            }),
          ),
        ...issues
          .filter((issue) => issue.componentId === component.id && (issue.screenId === null || issue.screenId === instance.screenId))
          .map(
            (issue): PinFinding => ({
              findingType: 'HandoffIssue',
              findingId: issue.id,
              label: issue.title,
              provenance: issue.provenance,
            }),
          ),
      ];

      const screenPins = pinsByScreen.get(instance.screenId) ?? [];
      screenPins.push({
        key: `component:${component.id}`,
        number: screenPins.length + 1,
        region,
        provenance: component.provenance,
        findings,
      });
      pinsByScreen.set(instance.screenId, screenPins);
    }
  }

  return { pinsByScreen, pinScreenIdByComponentId };
}
