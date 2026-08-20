import type { NewIssueFinding } from '@/lib/decisions';
import type { SpecificationCategory } from '@/lib/types';

// Deterministic, not an AI-prompt extension — stage 5 only ever sees a text
// summary (lib/ai/pipeline.ts's buildHandoffSummary), never images, so
// prompting it to compare numbers is strictly worse than comparing them in
// code: extra cost, hallucination risk on unit variants, non-reproducible
// output for something the readiness score already treats as deterministic.
// The tolerance/group-size constants below are flagged for the developer to
// confirm or adjust, matching the existing convention for undecided
// heuristics elsewhere (see lib/accessibility.ts's confidence values).
const NUMERIC_TOLERANCE = 2; // absolute units (typically px) — roughly half a common 4px grid step
const MIN_GROUP_SIZE = 3; // fewer than 3 comparable values can't distinguish "outlier" from "just two different components"
const MIN_MAJORITY_COUNT = 2; // the majority value must itself be an established pattern, not a coin flip between two singletons

export type ConsistencySpecInput = {
  componentName: string;
  category: SpecificationCategory;
  property: string;
  value: string;
  unit: string | null;
};

/**
 * Groups non-Rejected specifications by (category, canonical property name —
 * see SPECIFICATION_SYSTEM_PROMPT's canonical-naming instruction) and flags
 * values that diverge from the group's established majority. Numeric values
 * (the common case: spacing, dimensions, radii, font sizes) are compared
 * with NUMERIC_TOLERANCE; non-numeric values (colors, etc.) require an exact
 * case-insensitive match to belong to the majority. `Detected` provenance —
 * the mismatch itself is measured, not guessed — but the recommendation text
 * stays advisory ("N of M other components use X") and never asserts which
 * value is "correct," since two components can legitimately differ on
 * purpose. Title includes the component name so reruns reconcile each
 * outlier as its own reaffirmation rather than colliding on one shared
 * title (see lib/decisions.ts's reconcileIssueFindings, which matches on
 * category + title).
 */
export function detectConsistencyOutliers(specs: ConsistencySpecInput[]): NewIssueFinding[] {
  return detectConsistencyOutliersWithSource(specs).map((outlier) => outlier.finding);
}

/**
 * Same grouping/outlier logic as detectConsistencyOutliers, but also
 * returns which source entry produced each finding — discarded by the
 * plain function above since its only caller (the in-pipeline, single-
 * handoff gap-detection stage) doesn't need it, but a cross-handoff caller
 * does, to attribute each outlier back to the right handoff/component. See
 * lib/drift.ts.
 */
export type ConsistencyOutlier = { finding: NewIssueFinding; source: ConsistencySpecInput };

export function detectConsistencyOutliersWithSource(specs: ConsistencySpecInput[]): ConsistencyOutlier[] {
  const groups = new Map<string, ConsistencySpecInput[]>();

  for (const spec of specs) {
    const key = `${spec.category}::${spec.property.trim().toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(spec);
    groups.set(key, list);
  }

  const outliers: ConsistencyOutlier[] = [];

  for (const group of groups.values()) {
    const numeric = group.filter((spec) => !Number.isNaN(Number.parseFloat(spec.value)));
    const nonNumeric = group.filter((spec) => Number.isNaN(Number.parseFloat(spec.value)));

    outliers.push(...flagNumericOutliers(numeric));
    outliers.push(...flagStringOutliers(nonNumeric));
  }

  return outliers;
}

function flagNumericOutliers(entries: ConsistencySpecInput[]): ConsistencyOutlier[] {
  if (entries.length < MIN_GROUP_SIZE) return [];

  const withRounded = entries.map((entry) => ({ entry, rounded: Math.round(Number.parseFloat(entry.value)) }));
  const majorityValue = mostFrequent(withRounded.map(({ rounded }) => rounded));

  if (majorityValue === null) return [];

  const outliers: ConsistencyOutlier[] = [];

  withRounded.forEach(({ entry, rounded }) => {
    if (Math.abs(rounded - majorityValue.value) <= NUMERIC_TOLERANCE) return;

    const property = entry.property.trim().toLowerCase();
    const unitLabel = entry.unit ?? '';
    const majorityLabel = `${majorityValue.value}${unitLabel}`;

    outliers.push({
      source: entry,
      finding: buildFinding(
        entry.componentName,
        property,
        `${entry.value}${unitLabel}`,
        majorityLabel,
        majorityValue.count,
        entries.length,
      ),
    });
  });

  return outliers;
}

function flagStringOutliers(entries: ConsistencySpecInput[]): ConsistencyOutlier[] {
  if (entries.length < MIN_GROUP_SIZE) return [];

  const normalized = entries.map((entry) => entry.value.trim().toLowerCase());
  const majority = mostFrequent(normalized);

  if (majority === null) return [];

  const majorityDisplay = entries[normalized.indexOf(majority.value)]?.value ?? majority.value;
  const outliers: ConsistencyOutlier[] = [];

  entries.forEach((entry, index) => {
    if (normalized[index] === majority.value) return;

    const property = entry.property.trim().toLowerCase();

    outliers.push({
      source: entry,
      finding: buildFinding(entry.componentName, property, entry.value, majorityDisplay, majority.count, entries.length),
    });
  });

  return outliers;
}

function mostFrequent<T>(values: T[]): { value: T; count: number } | null {
  const freq = new Map<T, number>();
  for (const value of values) {
    freq.set(value, (freq.get(value) ?? 0) + 1);
  }

  let best: { value: T; count: number } | null = null;
  for (const [value, count] of freq) {
    if (!best || count > best.count) {
      best = { value, count };
    }
  }

  return best && best.count >= MIN_MAJORITY_COUNT ? best : null;
}

function buildFinding(
  componentName: string,
  property: string,
  actualDisplay: string,
  majorityDisplay: string,
  majorityCount: number,
  groupSize: number,
): NewIssueFinding {
  return {
    title: `${componentName}'s ${property} is inconsistent with other components`,
    description: `${componentName} uses ${actualDisplay} for ${property}, but ${majorityCount} of ${groupSize} components in this handoff use ${majorityDisplay}.`,
    severity: 'Low',
    category: 'VisualSpecifications',
    recommendation: `Confirm whether ${componentName}'s ${property} is intentionally different, or should match the handoff's established ${majorityDisplay}.`,
    provenance: 'Detected',
    confidence: 1.0,
  };
}
