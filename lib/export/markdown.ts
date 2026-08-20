import type { DeveloperHandoffProjection } from '@/lib/share';
import type { ComponentStateName } from '@/lib/types';

// Same split as InteractionsSection.tsx/StatesSection.tsx on the actual
// share page — kept in sync here rather than re-decided, since both views
// must agree on what "Interactions" vs "States" means for the same data.
const INTERACTION_STATE_NAMES: ComponentStateName[] = ['Hover', 'Focus', 'Disabled', 'Loading'];
const CONTENT_STATE_NAMES: ComponentStateName[] = ['Default', 'Empty', 'Error'];

function tag(provenance: string, reviewStatus: string): string {
  return `[${provenance}, ${reviewStatus}]`;
}

/**
 * Walks the same DeveloperHandoffProjection shape (lib/share.ts) that both
 * app/share/[token]/page.tsx and the authenticated preview page render,
 * mirroring the fixed section order from design-system.md exactly —
 * Overview → Screens → Components → Specifications → Interactions →
 * Responsive → States → Edge Cases → Implementation Notes — so the export
 * can never drift from what a developer sees on the actual page. Pure
 * string-building, no I/O.
 */
export function buildMarkdownExport(projection: DeveloperHandoffProjection): string {
  const sections: string[] = [];

  sections.push(buildOverview(projection));

  const screens = buildScreens(projection);
  if (screens) sections.push(screens);

  const components = buildComponents(projection);
  if (components) sections.push(components);

  const specifications = buildSpecifications(projection);
  if (specifications) sections.push(specifications);

  const interactions = buildStatesSubset(projection, 'Interactions', INTERACTION_STATE_NAMES);
  if (interactions) sections.push(interactions);

  const responsive = buildResponsive(projection);
  if (responsive) sections.push(responsive);

  const states = buildStatesSubset(projection, 'States', CONTENT_STATE_NAMES);
  if (states) sections.push(states);

  const edgeCases = buildEdgeCases(projection);
  if (edgeCases) sections.push(edgeCases);

  const notes = buildImplementationNotes(projection);
  if (notes) sections.push(notes);

  return sections.join('\n\n') + '\n';
}

function buildOverview(projection: DeveloperHandoffProjection): string {
  const lines = [`# ${projection.name}`];

  if (projection.description) {
    lines.push('', projection.description);
  }

  if (projection.readinessScore !== null && projection.readinessAlgorithmVersion !== null) {
    const unresolvedCritical = projection.issues.filter(
      (issue) => issue.severity === 'Critical' && (issue.status === 'Open' || issue.status === 'InReview'),
    ).length;
    const gate =
      unresolvedCritical > 0
        ? `Not ready — ${unresolvedCritical} critical issue${unresolvedCritical === 1 ? '' : 's'} unresolved`
        : 'Ready';
    lines.push(
      '',
      `**Readiness:** ${projection.readinessScore}% (v${projection.readinessAlgorithmVersion}) — ${gate}`,
    );
  }

  return lines.join('\n');
}

function buildScreens(projection: DeveloperHandoffProjection): string | null {
  if (projection.screens.length === 0) return null;

  const lines = ['## Screens'];
  for (const screen of projection.screens) {
    lines.push(`- ${screen.name} — ${screen.analysisStatus}`);
  }

  if (projection.screenFlows.length > 0) {
    lines.push('', '**Flow:**');
    for (const flow of projection.screenFlows) {
      const label = flow.label ? ` — ${flow.label}` : '';
      lines.push(`- ${flow.sourceScreenName} → ${flow.targetScreenName}${label}`);
    }
  }

  return lines.join('\n');
}

function buildComponents(projection: DeveloperHandoffProjection): string | null {
  if (projection.components.length === 0) return null;

  const lines = ['## Components'];
  for (const component of projection.components) {
    lines.push(
      '',
      `### ${component.name} (${component.type}) ${tag(component.provenance, component.reviewStatus)}`,
    );
    if (component.description) lines.push(component.description);
  }
  return lines.join('\n');
}

function buildSpecifications(projection: DeveloperHandoffProjection): string | null {
  const withSpecs = projection.components.filter((component) => component.specifications.length > 0);
  if (withSpecs.length === 0) return null;

  const lines = ['## Specifications'];
  for (const component of withSpecs) {
    lines.push('', `### ${component.name}`);
    for (const spec of component.specifications) {
      const value = spec.unit ? `${spec.value} ${spec.unit}` : spec.value;
      lines.push(`- ${spec.property}: \`${value}\` ${tag(spec.provenance, spec.reviewStatus)}`);
    }
  }
  return lines.join('\n');
}

function buildStatesSubset(
  projection: DeveloperHandoffProjection,
  heading: 'Interactions' | 'States',
  names: ComponentStateName[],
): string | null {
  const withStates = projection.components
    .map((component) => ({ ...component, states: component.states.filter((state) => names.includes(state.name)) }))
    .filter((component) => component.states.length > 0);

  if (withStates.length === 0) return null;

  const lines = [`## ${heading}`];
  for (const component of withStates) {
    lines.push('', `### ${component.name}`);
    for (const state of component.states) {
      const description = state.description ? `: ${state.description}` : '';
      lines.push(`- ${state.name}${description} ${tag(state.provenance, state.reviewStatus)}`);
    }
  }
  return lines.join('\n');
}

function buildResponsive(projection: DeveloperHandoffProjection): string | null {
  if (projection.responsiveRules.length === 0) return null;

  const lines = ['## Responsive behavior'];
  for (const rule of projection.responsiveRules) {
    const screen = rule.screenName ? `${rule.screenName} — ` : '';
    lines.push(`- ${rule.viewportCategory} — ${screen}${rule.behavior} ${tag(rule.provenance, rule.reviewStatus)}`);
  }
  return lines.join('\n');
}

function buildEdgeCases(projection: DeveloperHandoffProjection): string | null {
  if (projection.issues.length === 0) return null;

  const lines = ['## Edge cases & open questions'];
  for (const issue of projection.issues) {
    lines.push(
      '',
      `### ${issue.title} — ${issue.severity} ${tag(issue.provenance, issue.status)}`,
      issue.description,
    );
    if (issue.recommendation) lines.push(`**Recommendation:** ${issue.recommendation}`);
    lines.push(`Category: ${issue.category}`);
  }
  return lines.join('\n');
}

function buildImplementationNotes(projection: DeveloperHandoffProjection): string | null {
  if (projection.notes.length === 0) return null;

  const lines = ['## Implementation notes'];
  for (const note of projection.notes) {
    lines.push('', note.content);
  }
  return lines.join('\n');
}
