import { describe, expect, it } from 'vitest';

import type { ChangelogEntry, ChangelogIssueRef } from './changelog';
import { buildReanalysisSummary } from './reanalysis';

const ref = (issueId: string, status: ChangelogIssueRef['status'] = 'Open'): ChangelogIssueRef => ({
  issueId, title: issueId, severity: 'High', category: 'EdgeCases', status,
});
const run = (id: string, at: string, parts: Partial<ChangelogEntry> = {}): ChangelogEntry => ({
  analysisRunId: id, runDate: new Date(at), created: [], reaffirmed: [], conflicts: [], ...parts,
});

const first = run('r1', '2026-11-12T09:30:00Z', { created: [ref('a'), ref('b')] });
const now = new Date('2026-11-23T12:00:00Z');

describe('buildReanalysisSummary', () => {
  it('shows nothing after a first analysis', () => {
    expect(buildReanalysisSummary({ entries: [first], latestRunId: 'r1', gapDecisions: new Map(), gapAnswers: new Map(), now })).toBeNull();
  });

  it('summarises a re-analysis with a conflict, new gaps and still-flagged ones', () => {
    const latest = run('r2', '2026-11-23T10:42:00Z', {
      conflicts: [ref('tablet', 'Dismissed')],
      created: [ref('promo'), ref('empty')],
      reaffirmed: [ref('a'), ref('b', 'Resolved')],
    });
    const summary = buildReanalysisSummary({
      entries: [latest, first],
      latestRunId: 'r2',
      gapDecisions: new Map([['tablet', { action: 'Reject', previousValue: null, createdAt: new Date('2026-11-12T11:00:00Z') }]]),
      gapAnswers: new Map(),
      now,
    });

    expect(summary).toMatchObject({ isToday: true, changedCount: 3 });
    expect(summary?.conflicts).toEqual([
      { id: 'tablet', title: 'tablet', severity: 'High', previous: { action: 'Reject', label: 'Not a gap', decidedAt: '2026-11-12T11:00:00.000Z', answer: null } },
    ]);
    expect(summary?.newGaps.map((gap) => gap.id)).toEqual(['promo', 'empty']);
    expect(summary?.stillFlagged.map((gap) => gap.id)).toEqual(['a']);
  });

  it('treats a conflict as handled once the designer decides after the run, and hides when nothing is left', () => {
    const latest = run('r2', '2026-11-23T10:42:00Z', { conflicts: [ref('tablet', 'Dismissed')] });
    const decidedAfter = new Map([['tablet', { action: 'Reject' as const, previousValue: null, createdAt: new Date('2026-11-23T11:00:00Z') }]]);

    expect(buildReanalysisSummary({ entries: [latest, first], latestRunId: 'r2', gapDecisions: decidedAfter, gapAnswers: new Map(), now })).toBeNull();
  });

  it('only describes the newest run', () => {
    const older = run('r2', '2026-11-20T10:00:00Z', { created: [ref('x')] });
    expect(buildReanalysisSummary({ entries: [older, first], latestRunId: 'r3', gapDecisions: new Map(), gapAnswers: new Map(), now })).toBeNull();
  });

  it('carries the answer when the earlier decision was an answer', () => {
    const latest = run('r2', '2026-11-23T10:42:00Z', { conflicts: [ref('declined', 'Resolved')] });
    const summary = buildReanalysisSummary({
      entries: [latest, first],
      latestRunId: 'r2',
      gapDecisions: new Map([['declined', { action: 'Override', previousValue: null, createdAt: new Date('2026-11-15T08:00:00Z') }]]),
      gapAnswers: new Map([['declined', 'Show the inline error banner']]),
      now,
    });
    expect(summary?.conflicts[0]?.previous).toMatchObject({ action: 'Override', label: 'Answered', answer: 'Show the inline error banner' });
  });
});
