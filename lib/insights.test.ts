import { describe, expect, it, vi } from 'vitest';

const mockDb = {
  handoff: { findMany: vi.fn() },
  handoffIssue: { findMany: vi.fn(), groupBy: vi.fn() },
  analysisRun: { findMany: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { getPortfolioInsights } = await import('./insights');

const ALL_CATEGORIES = [
  'VisualSpecifications',
  'Components',
  'ResponsiveBehavior',
  'InteractionStates',
  'EdgeCases',
  'Accessibility',
];

function emptyGroupByRows() {
  return [];
}

describe('getPortfolioInsights', () => {
  it('returns a null weakest category and zeroed averages when the user has no non-Archived handoffs', async () => {
    mockDb.handoff.findMany.mockResolvedValue([]);
    mockDb.handoffIssue.groupBy.mockResolvedValue(emptyGroupByRows());
    mockDb.analysisRun.findMany.mockResolvedValue([]);

    const result = await getPortfolioInsights('user-a');

    expect(result.handoffCount).toBe(0);
    expect(result.weakestCategory).toBeNull();
    expect(Object.values(result.categoryAverages).every((score) => score === 0)).toBe(true);
  });

  it('excludes Archived handoffs from every query', async () => {
    mockDb.handoff.findMany.mockResolvedValue([]);
    mockDb.handoffIssue.groupBy.mockResolvedValue(emptyGroupByRows());
    mockDb.analysisRun.findMany.mockResolvedValue([]);

    await getPortfolioInsights('user-a');

    expect(mockDb.handoff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user-a', status: { not: 'Archived' } } }),
    );
    expect(mockDb.handoffIssue.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ handoff: { ownerId: 'user-a', status: { not: 'Archived' } } }),
      }),
    );
  });

  it('averages per-category scores across handoffs by reusing computeReadiness, and identifies the weakest category', async () => {
    mockDb.handoff.findMany.mockResolvedValue([{ id: 'handoff-1' }, { id: 'handoff-2' }]);
    // computeReadiness itself queries handoffIssue.findMany per handoff.
    mockDb.handoffIssue.findMany.mockImplementation(({ where }: { where: { handoffId: string } }) => {
      if (where.handoffId === 'handoff-1') {
        return Promise.resolve([
          { severity: 'Critical', category: 'Accessibility', status: 'Open' }, // -40
        ]);
      }
      return Promise.resolve([]); // handoff-2: perfect score everywhere
    });
    mockDb.handoffIssue.groupBy.mockResolvedValue(emptyGroupByRows());
    mockDb.analysisRun.findMany.mockResolvedValue([]);

    const result = await getPortfolioInsights('user-a');

    // handoff-1's Accessibility: 60, handoff-2's Accessibility: 100 -> average 80
    expect(result.categoryAverages.Accessibility).toBe(80);
    // every other category: 100 and 100 -> average 100
    expect(result.categoryAverages.Components).toBe(100);
    expect(result.weakestCategory).toEqual({ category: 'Accessibility', averageScore: 80 });
  });

  it('builds the trend oldest-first from AnalysisRun.readinessSnapshot, skipping runs with no snapshot', async () => {
    mockDb.handoff.findMany.mockResolvedValue([{ id: 'handoff-1' }]);
    mockDb.handoffIssue.findMany.mockResolvedValue([]);
    mockDb.handoffIssue.groupBy.mockResolvedValue(emptyGroupByRows());
    mockDb.analysisRun.findMany.mockResolvedValue([
      {
        id: 'run-2',
        createdAt: new Date('2026-08-15T00:00:00Z'),
        readinessSnapshot: { categories: { Accessibility: 90 } },
      },
      {
        id: 'run-1',
        createdAt: new Date('2026-08-10T00:00:00Z'),
        readinessSnapshot: { categories: { Accessibility: 70 } },
      },
    ]);

    const result = await getPortfolioInsights('user-a');

    expect(result.trend.Accessibility.map((point) => point.analysisRunId)).toEqual(['run-1', 'run-2']);
    expect(result.trend.Accessibility.map((point) => point.score)).toEqual([70, 90]);
    // Categories with no data in any snapshot stay an empty series, not an error.
    expect(result.trend.Components).toEqual([]);
  });

  it('counts open Critical/High issues per category from a real groupBy, not derived from computeReadiness', async () => {
    mockDb.handoff.findMany.mockResolvedValue([]);
    mockDb.handoffIssue.groupBy.mockResolvedValue([
      { category: 'Accessibility', _count: 3 },
      { category: 'EdgeCases', _count: 1 },
    ]);
    mockDb.analysisRun.findMany.mockResolvedValue([]);

    const result = await getPortfolioInsights('user-a');

    expect(result.criticalOrHighCountByCategory.Accessibility).toBe(3);
    expect(result.criticalOrHighCountByCategory.EdgeCases).toBe(1);
    expect(result.criticalOrHighCountByCategory.Components).toBe(0);
  });

  it('always returns every readiness category as a key, never a partial object', async () => {
    mockDb.handoff.findMany.mockResolvedValue([]);
    mockDb.handoffIssue.groupBy.mockResolvedValue(emptyGroupByRows());
    mockDb.analysisRun.findMany.mockResolvedValue([]);

    const result = await getPortfolioInsights('user-a');

    expect(Object.keys(result.categoryAverages).sort()).toEqual([...ALL_CATEGORIES].sort());
    expect(Object.keys(result.criticalOrHighCountByCategory).sort()).toEqual([...ALL_CATEGORIES].sort());
    expect(Object.keys(result.trend).sort()).toEqual([...ALL_CATEGORIES].sort());
  });
});
