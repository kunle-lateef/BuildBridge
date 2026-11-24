import { EXAMPLE, type ExampleComponentKey, type ExampleScreenKey } from '@/lib/example/fixture';
import { calculateReadiness } from '@/lib/readiness';
import type { DeveloperHandoffProjection } from '@/lib/share';

/** Public path of an example screen image (committed under public/example/). */
export const exampleImageUrl = (file: string) => `/example/${file}`;

/**
 * The public /example page's data (Figma `05 — Share view / Example
 * handoff`): the developer projection of the example fixture, with fixed
 * ids and no database. Readiness comes from calculateReadiness over the
 * fixture's open gaps, the same formula real handoffs use.
 */
export function buildExampleProjection(): DeveloperHandoffProjection {
  const screenId = (key: ExampleScreenKey) => `example-screen-${key}`;
  const componentId = (key: ExampleComponentKey) => `example-component-${key}`;
  const screenName = new Map(EXAMPLE.screens.map((screen) => [screen.key, screen.name]));
  const readiness = calculateReadiness(EXAMPLE.gaps.map((gap) => ({ severity: gap.severity, category: gap.category, status: 'Open' })));

  return {
    name: EXAMPLE.name,
    description: EXAMPLE.description,
    readinessScore: readiness.overall,
    readinessAlgorithmVersion: readiness.version,
    screens: EXAMPLE.screens.map((screen) => ({
      id: screenId(screen.key),
      name: screen.name,
      imageUrl: exampleImageUrl(screen.file),
      analysisStatus: 'Analyzed',
      pins: [],
    })),
    components: EXAMPLE.components.map((component) => ({
      id: componentId(component.key),
      name: component.name,
      type: component.type,
      description: component.description,
      provenance: component.provenance,
      reviewStatus: component.confirmed ? 'Confirmed' : 'Unreviewed',
      isImplemented: false,
      pinScreenId: screenId(component.screen),
      specifications: component.specifications.map((spec, index) => ({
        id: `${componentId(component.key)}-spec-${index}`,
        category: spec.category,
        property: spec.property,
        value: spec.value,
        unit: spec.unit ?? null,
        provenance: spec.provenance,
        reviewStatus: spec.confirmed ? 'Confirmed' : 'Unreviewed',
        isImplemented: false,
      })),
      states: component.states.map((state, index) => ({
        id: `${componentId(component.key)}-state-${index}`,
        name: state.name,
        description: state.description,
        provenance: state.provenance,
        reviewStatus: state.confirmed ? 'Confirmed' : 'Unreviewed',
        isImplemented: false,
      })),
    })),
    responsiveRules: EXAMPLE.responsiveRules.map((rule, index) => ({
      id: `example-rule-${index}`,
      componentId: rule.component ? componentId(rule.component) : null,
      screenName: screenName.get('checkout') ?? null,
      viewportCategory: rule.viewportCategory,
      behavior: rule.behavior,
      provenance: rule.provenance,
      reviewStatus: rule.confirmed ? 'Confirmed' : 'Unreviewed',
      isImplemented: false,
      pinScreenId: null,
    })),
    issues: EXAMPLE.gaps.map((gap) => ({
      id: `example-gap-${gap.key}`,
      componentId: gap.component ? componentId(gap.component) : null,
      title: gap.title,
      description: gap.description,
      severity: gap.severity,
      category: gap.category,
      recommendation: gap.recommendation ?? null,
      status: 'Open',
      provenance: gap.provenance,
      pinScreenId: gap.screen ? screenId(gap.screen) : null,
      answer: null,
    })),
    notes: EXAMPLE.notes.map((note, index) => ({
      id: `example-note-${index}`,
      content: note.content,
      componentId: note.component ? componentId(note.component) : null,
    })),
    screenFlows: EXAMPLE.flows.map((flow, index) => ({
      id: `example-flow-${index}`,
      sourceScreenName: screenName.get(flow.from) ?? flow.from,
      targetScreenName: screenName.get(flow.to) ?? flow.to,
      label: flow.label,
    })),
    recentUpdates: [],
  };
}
