import { describe, expect, it, vi } from 'vitest';

const mockDb = {
  analysisRun: { findMany: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { getAnalysisChangelog } = await import('./changelog');

function issueFinding(kind: 'Created' | 'Reaffirmed' | 'Conflict', overrides: Record<string, unknown> = {}) {
  return {
    kind,
    handoffIssue: {
      id: 'issue-1',
      title: 'Missing empty state',
      severity: 'Medium',
      category: 'InteractionStates',
      status: 'Open',
      ...overrides,
    },
  };
}

describe('getAnalysisChangelog', () => {
  it('only queries runs that produced at least one finding', async () => {
    mockDb.analysisRun.findMany.mockResolvedValue([]);

    await getAnalysisChangelog('handoff-1');

    expect(mockDb.analysisRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { handoffId: 'handoff-1', findings: { some: {} } } }),
    );
  });

  it('splits a run into created / reaffirmed / conflict buckets by finding kind', async () => {
    mockDb.analysisRun.findMany.mockResolvedValue([
      {
        id: 'run-1',
        createdAt: new Date('2026-08-15T00:00:00Z'),
        findings: [
          issueFinding('Created', { id: 'issue-1', title: 'New gap found' }),
          issueFinding('Reaffirmed', { id: 'issue-2', title: 'Still open gap' }),
          issueFinding('Conflict', { id: 'issue-3', title: 'Already dismissed gap', status: 'Dismissed' }),
        ],
      },
    ]);

    const result = await getAnalysisChangelog('handoff-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.analysisRunId).toBe('run-1');
    expect(result[0]?.created).toEqual([
      { issueId: 'issue-1', title: 'New gap found', severity: 'Medium', category: 'InteractionStates', status: 'Open' },
    ]);
    expect(result[0]?.reaffirmed).toEqual([
      { issueId: 'issue-2', title: 'Still open gap', severity: 'Medium', category: 'InteractionStates', status: 'Open' },
    ]);
    expect(result[0]?.conflicts).toEqual([
      {
        issueId: 'issue-3',
        title: 'Already dismissed gap',
        severity: 'Medium',
        category: 'InteractionStates',
        status: 'Dismissed',
      },
    ]);
  });

  it('returns one entry per qualifying run, most recent first (as ordered by the query)', async () => {
    mockDb.analysisRun.findMany.mockResolvedValue([
      { id: 'run-2', createdAt: new Date('2026-08-15T00:00:00Z'), findings: [issueFinding('Created')] },
      { id: 'run-1', createdAt: new Date('2026-08-14T00:00:00Z'), findings: [issueFinding('Created')] },
    ]);

    const result = await getAnalysisChangelog('handoff-1');

    expect(result.map((entry) => entry.analysisRunId)).toEqual(['run-2', 'run-1']);
  });
});
