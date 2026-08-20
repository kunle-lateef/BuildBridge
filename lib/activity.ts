import { db } from '@/lib/db';
import type { AnalysisRunStatus, DesignerDecisionAction, DeveloperFlagKind } from '@/lib/types';

// ---------------------------------------------------------------------------
// Dashboard activity feed
//
// Merges three independently-timestamped event sources into one
// chronological stream. Three small queries unioned and sorted in memory —
// at realistic per-user row counts this is far cheaper than a DB-level
// UNION, and keeps each query simple and independently indexed.
// ---------------------------------------------------------------------------

export type ActivityEvent =
  | { kind: 'AnalysisFinished'; id: string; handoffId: string; handoffName: string; status: AnalysisRunStatus; at: Date }
  | { kind: 'DecisionRecorded'; id: string; handoffId: string; handoffName: string; action: DesignerDecisionAction; at: Date }
  | { kind: 'DeveloperFlagReceived'; id: string; handoffId: string; handoffName: string; flagKind: DeveloperFlagKind; at: Date };

export async function getRecentActivity(userId: string, limit = 20): Promise<ActivityEvent[]> {
  const ownedHandoff = { ownerId: userId, status: { not: 'Archived' as const } };

  const [runs, decisions, flags] = await Promise.all([
    db.analysisRun.findMany({
      where: { handoff: ownedHandoff, completedAt: { not: null } },
      select: { id: true, status: true, completedAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { completedAt: 'desc' },
      take: limit,
    }),
    db.designerDecision.findMany({
      where: { handoff: ownedHandoff },
      select: { id: true, action: true, createdAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.developerFlag.findMany({
      where: { handoff: ownedHandoff },
      select: { id: true, kind: true, createdAt: true, handoff: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const events: ActivityEvent[] = [
    ...runs.map(
      (run): ActivityEvent => ({
        kind: 'AnalysisFinished',
        id: run.id,
        handoffId: run.handoff.id,
        handoffName: run.handoff.name,
        status: run.status,
        // completedAt is guaranteed non-null by the where clause above.
        at: run.completedAt as Date,
      }),
    ),
    ...decisions.map(
      (decision): ActivityEvent => ({
        kind: 'DecisionRecorded',
        id: decision.id,
        handoffId: decision.handoff.id,
        handoffName: decision.handoff.name,
        action: decision.action,
        at: decision.createdAt,
      }),
    ),
    ...flags.map(
      (flag): ActivityEvent => ({
        kind: 'DeveloperFlagReceived',
        id: flag.id,
        handoffId: flag.handoff.id,
        handoffName: flag.handoff.name,
        flagKind: flag.kind,
        at: flag.createdAt,
      }),
    ),
  ];

  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  return events.slice(0, limit);
}
