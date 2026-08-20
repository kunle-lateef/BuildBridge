import { subDays, subMonths } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {
  analysisRun: { create: vi.fn() },
  user: { update: vi.fn() },
  handoff: { update: vi.fn() },
};

const mockDb = {
  handoff: { findUnique: vi.fn() },
  designAsset: { count: vi.fn(), findMany: vi.fn() },
  analysisRun: { findFirst: vi.fn() },
  user: { findUniqueOrThrow: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
};

const mockEnqueueAnalysisRun = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/queue', () => ({ enqueueAnalysisRun: mockEnqueueAnalysisRun }));

const { startAnalysisRun } = await import('./analysis');

const HANDOFF_ID = 'handoff-1';
const USER_ID = 'user-a';

const baseUser = {
  id: USER_ID,
  analysisQuota: 5,
  analysisUsageCount: 2,
  billingCycleStart: subDays(new Date(), 5),
};

function mockNoReusableRun() {
  mockDb.analysisRun.findFirst.mockResolvedValue(null);
}

describe('startAnalysisRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
    mockTx.analysisRun.create.mockResolvedValue({ id: 'run-1' });
  });

  it('rejects with not_found when the handoff does not exist', async () => {
    mockDb.handoff.findUnique.mockResolvedValue(null);

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.designAsset.count).not.toHaveBeenCalled();
  });

  it('rejects with not_found when the handoff belongs to a different user', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: 'someone-else' });

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
  });

  it('rejects with no_screens when there are no processed design assets', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: USER_ID });
    mockDb.designAsset.count.mockResolvedValue(0);

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('no_screens');
    expect(mockDb.analysisRun.findFirst).not.toHaveBeenCalled();
  });

  it('reuses a prior run when every processed asset matches a checksum from the last successful run, and never touches quota or the queue', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: USER_ID });
    mockDb.designAsset.count.mockResolvedValue(1);

    const completedAt = subDays(new Date(), 1);
    mockDb.analysisRun.findFirst.mockResolvedValue({ id: 'prior-run', completedAt, createdAt: completedAt });
    mockDb.designAsset.findMany
      .mockResolvedValueOnce([{ checksum: 'abc123' }]) // prior assets
      .mockResolvedValueOnce([{ checksum: 'abc123' }]); // "new" assets — same checksum, so a duplicate

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result).toEqual({ ok: true, data: { analysisRunId: 'prior-run', reused: true } });
    expect(mockDb.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockEnqueueAnalysisRun).not.toHaveBeenCalled();
  });

  it('does not reuse when a new asset checksum does not match any prior asset', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: USER_ID });
    mockDb.designAsset.count.mockResolvedValue(2);

    const completedAt = subDays(new Date(), 1);
    mockDb.analysisRun.findFirst.mockResolvedValue({ id: 'prior-run', completedAt, createdAt: completedAt });
    mockDb.designAsset.findMany
      .mockResolvedValueOnce([{ checksum: 'abc123' }]) // prior assets
      .mockResolvedValueOnce([{ checksum: 'a-genuinely-new-checksum' }]); // new, unmatched asset

    mockDb.user.findUniqueOrThrow.mockResolvedValue(baseUser);

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.reused).toBe(false);
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects with quota_exceeded when the current cycle is used up, and never enqueues', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: USER_ID });
    mockDb.designAsset.count.mockResolvedValue(1);
    mockNoReusableRun();
    mockDb.user.findUniqueOrThrow.mockResolvedValue({
      ...baseUser,
      analysisQuota: 5,
      analysisUsageCount: 5,
    });

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('quota_exceeded');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockEnqueueAnalysisRun).not.toHaveBeenCalled();
  });

  it('creates a run, increments usage, marks the handoff Analyzing, and enqueues when quota is available', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: USER_ID });
    mockDb.designAsset.count.mockResolvedValue(1);
    mockNoReusableRun();
    mockDb.user.findUniqueOrThrow.mockResolvedValue(baseUser);

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result).toEqual({ ok: true, data: { analysisRunId: 'run-1', reused: false } });
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { analysisUsageCount: { increment: 1 } },
    });
    expect(mockTx.handoff.update).toHaveBeenCalledWith({
      where: { id: HANDOFF_ID },
      data: { status: 'Analyzing' },
    });
    expect(mockEnqueueAnalysisRun).toHaveBeenCalledWith({ analysisRunId: 'run-1', handoffId: HANDOFF_ID });
  });

  it('resets usage to 1 and rolls billingCycleStart forward when the cycle has rolled over, even if the stale usage count was already at quota', async () => {
    mockDb.handoff.findUnique.mockResolvedValue({ id: HANDOFF_ID, ownerId: USER_ID });
    mockDb.designAsset.count.mockResolvedValue(1);
    mockNoReusableRun();
    mockDb.user.findUniqueOrThrow.mockResolvedValue({
      ...baseUser,
      analysisQuota: 5,
      analysisUsageCount: 5,
      billingCycleStart: subMonths(new Date(), 2),
    });

    const result = await startAnalysisRun(HANDOFF_ID, USER_ID);

    expect(result.ok).toBe(true);
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { analysisUsageCount: 1, billingCycleStart: expect.any(Date) },
    });
  });
});
