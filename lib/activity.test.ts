import { describe, expect, it, vi } from 'vitest';

const mockDb = {
  analysisRun: { findMany: vi.fn() },
  designerDecision: { findMany: vi.fn() },
  developerFlag: { findMany: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { getRecentActivity } = await import('./activity');

const HANDOFF = { id: 'handoff-1', name: 'Checkout redesign' };

describe('getRecentActivity', () => {
  it('scopes every query to the owner and excludes Archived handoffs', async () => {
    mockDb.analysisRun.findMany.mockResolvedValue([]);
    mockDb.designerDecision.findMany.mockResolvedValue([]);
    mockDb.developerFlag.findMany.mockResolvedValue([]);

    await getRecentActivity('user-a', 20);

    const ownedNotArchived = { ownerId: 'user-a', status: { not: 'Archived' } };
    expect(mockDb.analysisRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ handoff: ownedNotArchived }) }),
    );
    expect(mockDb.designerDecision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { handoff: ownedNotArchived } }),
    );
    expect(mockDb.developerFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { handoff: ownedNotArchived } }),
    );
  });

  it('merges all three event sources into one chronologically-sorted stream, newest first', async () => {
    mockDb.analysisRun.findMany.mockResolvedValue([
      { id: 'run-1', status: 'Completed', completedAt: new Date('2026-08-10T00:00:00Z'), handoff: HANDOFF },
    ]);
    mockDb.designerDecision.findMany.mockResolvedValue([
      { id: 'decision-1', action: 'Confirm', createdAt: new Date('2026-08-12T00:00:00Z'), handoff: HANDOFF },
    ]);
    mockDb.developerFlag.findMany.mockResolvedValue([
      { id: 'flag-1', kind: 'Question', createdAt: new Date('2026-08-11T00:00:00Z'), handoff: HANDOFF },
    ]);

    const result = await getRecentActivity('user-a', 20);

    expect(result.map((event) => event.id)).toEqual(['decision-1', 'flag-1', 'run-1']);
    expect(result[0]).toEqual(
      expect.objectContaining({ kind: 'DecisionRecorded', handoffId: 'handoff-1', handoffName: 'Checkout redesign' }),
    );
  });

  it('caps the merged stream at the requested limit, even when each source alone stays under it', async () => {
    const manyRuns = Array.from({ length: 5 }, (_, i) => ({
      id: `run-${i}`,
      status: 'Completed',
      completedAt: new Date(2026, 7, i + 1),
      handoff: HANDOFF,
    }));
    mockDb.analysisRun.findMany.mockResolvedValue(manyRuns);
    mockDb.designerDecision.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `decision-${i}`,
        action: 'Confirm',
        createdAt: new Date(2026, 7, i + 1),
        handoff: HANDOFF,
      })),
    );
    mockDb.developerFlag.findMany.mockResolvedValue([]);

    const result = await getRecentActivity('user-a', 3);

    expect(result).toHaveLength(3);
  });
});
