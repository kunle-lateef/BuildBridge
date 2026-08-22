import { GitCompare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { auth } from '@/lib/auth';
import { getPortfolioDrift } from '@/lib/drift';
import type { IssueSeverity } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Drift — BuildBridge',
};

const SEVERITY_ORDER: IssueSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Recommendation'];

/**
 * Cross-handoff design-system drift — the same outlier detection that runs
 * per-handoff during analysis (lib/consistency.ts), promoted to compare a
 * canonical property across every non-Archived handoff. Read-only: nothing
 * here is persisted, see lib/drift.ts.
 */
export default async function DriftPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const findings = await getPortfolioDrift(session.user.id);
  const affectedHandoffCount = new Set(findings.map((finding) => finding.handoffId)).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Drift
        </h1>
        <p className="text-[--color-text-secondary]">
          Where a value diverges from the majority across your handoffs — a read-only signal, not a finding recorded
          against any handoff.
        </p>
      </div>

      {findings.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <GitCompare aria-hidden="true" size={32} className="text-[--color-text-muted]" />
          <p className="text-[--color-text-secondary]">
            No drift detected across your handoffs yet — this fills in once you have a few handoffs sharing similar
            components.
          </p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[--color-text-secondary]">
                Drift findings across {affectedHandoffCount} {affectedHandoffCount === 1 ? 'handoff' : 'handoffs'}
              </span>
              <span className="font-mono text-[length:var(--font-desktop-heading-1-bold-size)] font-bold text-[--color-text-primary]">
                {findings.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_ORDER.map((severity) => {
                const count = findings.filter((finding) => finding.severity === severity).length;
                if (count === 0) return null;

                return (
                  <span key={severity} className="flex items-center gap-1.5">
                    <SeverityBadge severity={severity} /> {count}
                  </span>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            {findings.map((finding, index) => (
              <Card key={`${finding.handoffId}-${index}`} className="flex flex-col gap-1.5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <span className="font-medium text-[--color-text-primary]">{finding.title}</span>
                  <Link
                    href={`/handoffs/${finding.handoffId}`}
                    className="ml-auto text-[--color-primary] hover:underline"
                  >
                    {finding.handoffName}
                  </Link>
                </div>
                <p className="text-[--color-text-secondary]">{finding.description}</p>
                {finding.recommendation && (
                  <p className="text-[--color-text-secondary]">
                    <span className="font-medium">Recommendation:</span> {finding.recommendation}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
