import { detectConsistencyOutliersWithSource, type ConsistencySpecInput } from '@/lib/consistency';
import { db } from '@/lib/db';
import type { IssueSeverity, ProvenanceType, ReadinessCategory } from '@/lib/types';

// ---------------------------------------------------------------------------
// Cross-handoff design-system drift
//
// Promotes lib/consistency.ts's per-handoff outlier detection to compare a
// canonical (category, property) pair across ALL of a user's non-Archived
// handoffs. Reuses detectConsistencyOutliersWithSource's grouping/outlier
// math unchanged — nothing about that logic is handoff-scoped, it just
// operates on whatever list it's handed.
//
// Deliberately NOT a NewIssueFinding — this is never persisted (never
// passed to persistGapDetectionFindings). It's an ephemeral, request-
// computed read-only view, not a new pipeline stage or a new HandoffIssue.
// The distinct type name signals that at a glance.
// ---------------------------------------------------------------------------

type PortfolioDriftFinding = {
  title: string;
  description: string;
  severity: IssueSeverity;
  category: ReadinessCategory;
  recommendation?: string;
  provenance: ProvenanceType;
  confidence: number;
  handoffId: string;
  handoffName: string;
};

// ConsistencySpecInput plus the attribution detectConsistencyOutliersWithSource
// doesn't need but this cross-handoff caller does. TypeScript's structural
// typing means detectConsistencyOutliersWithSource happily accepts (and
// passes back through `source`, untouched) an object with extra fields —
// so these ride along at runtime without needing a separate lookup/rematch
// step after the fact.
type DriftSpecInput = ConsistencySpecInput & { handoffId: string; handoffName: string };

export async function getPortfolioDrift(userId: string): Promise<PortfolioDriftFinding[]> {
  const specs = await db.specification.findMany({
    where: {
      component: { handoff: { ownerId: userId, status: { not: 'Archived' } } },
      reviewStatus: { not: 'Rejected' },
    },
    include: { component: { include: { handoff: { select: { id: true, name: true } } } } },
  });

  const driftInputs: DriftSpecInput[] = specs.flatMap((spec) =>
    spec.component?.handoff
      ? [
          {
            componentName: spec.component.name,
            category: spec.category,
            property: spec.property,
            value: spec.value,
            unit: spec.unit,
            handoffId: spec.component.handoff.id,
            handoffName: spec.component.handoff.name,
          },
        ]
      : [],
  );

  const outliers = detectConsistencyOutliersWithSource(driftInputs);

  return outliers.map((outlier) => {
    const source = outlier.source as DriftSpecInput;

    return {
      ...outlier.finding,
      handoffId: source.handoffId,
      handoffName: source.handoffName,
    };
  });
}
