import { db } from '@/lib/db';
import type { IssueSeverity, IssueStatus, ReadinessCategory } from '@/lib/types';

// ---------------------------------------------------------------------------
// Re-analysis changelog
//
// Honestly scoped to gap-detection findings — stages 1-4 skip screens
// already Analyzed, so gap detection (stage 5) is the only stage that
// re-synthesizes and re-runs on every AnalysisRun. Reads back the
// AnalysisRunFinding event log persistGapDetectionFindings (lib/decisions.ts)
// writes, one entry per run that produced at least one finding.
// ---------------------------------------------------------------------------

export type ChangelogIssueRef = {
  issueId: string;
  title: string;
  severity: IssueSeverity;
  category: ReadinessCategory;
  status: IssueStatus;
};

export type ChangelogEntry = {
  analysisRunId: string;
  runDate: Date;
  created: ChangelogIssueRef[];
  reaffirmed: ChangelogIssueRef[];
  conflicts: ChangelogIssueRef[];
};

export async function getAnalysisChangelog(handoffId: string): Promise<ChangelogEntry[]> {
  const runs = await db.analysisRun.findMany({
    where: { handoffId, findings: { some: {} } },
    orderBy: { createdAt: 'desc' },
    include: {
      findings: {
        include: {
          handoffIssue: { select: { id: true, title: true, severity: true, category: true, status: true } },
        },
      },
    },
  });

  return runs.map((run) => {
    const byKind = (kind: 'Created' | 'Reaffirmed' | 'Conflict'): ChangelogIssueRef[] =>
      run.findings
        .filter((finding) => finding.kind === kind)
        .map((finding) => ({
          issueId: finding.handoffIssue.id,
          title: finding.handoffIssue.title,
          severity: finding.handoffIssue.severity,
          category: finding.handoffIssue.category,
          status: finding.handoffIssue.status,
        }));

    return {
      analysisRunId: run.id,
      runDate: run.createdAt,
      created: byKind('Created'),
      reaffirmed: byKind('Reaffirmed'),
      conflicts: byKind('Conflict'),
    };
  });
}
