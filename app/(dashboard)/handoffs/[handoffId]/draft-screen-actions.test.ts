import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  screen: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  designAsset: { delete: vi.fn() },
  handoff: { findUnique: vi.fn() },
  $transaction: vi.fn((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(mockDb) : Promise.all(arg as Promise<unknown>[]),
  ),
};
const mockAuth = vi.fn();
const mockDeleteObject = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/storage', () => ({ deleteObject: mockDeleteObject, getObjectBytes: vi.fn(), putObject: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@/lib/analysis', () => ({ startAnalysisRun: vi.fn() }));

const { deleteDraftScreen, reorderDraftScreens } = await import('./upload-actions');

const SESSION = { user: { id: 'user-a' } };

describe('deleteDraftScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a screen on someone else’s handoff, without deleting anything', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockDb.screen.findUnique.mockResolvedValue({
      id: 'screen-1',
      assetId: 'asset-1',
      asset: { storageReference: 'handoffs/h/a.png' },
      handoff: { id: 'h', ownerId: 'user-b', status: 'Draft' },
    });

    const result = await deleteDraftScreen('screen-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.designAsset.delete).not.toHaveBeenCalled();
  });

  it('refuses once the handoff is no longer a Draft, so analysed screens keep their findings', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockDb.screen.findUnique.mockResolvedValue({
      id: 'screen-1',
      assetId: 'asset-1',
      asset: { storageReference: 'handoffs/h/a.png' },
      handoff: { id: 'h', ownerId: 'user-a', status: 'NeedsReview' },
    });

    const result = await deleteDraftScreen('screen-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_draft');
    expect(mockDb.designAsset.delete).not.toHaveBeenCalled();
  });

  it('deletes the asset, renumbers the rest, and removes the stored file', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockDb.screen.findUnique.mockResolvedValue({
      id: 'screen-1',
      assetId: 'asset-1',
      asset: { storageReference: 'handoffs/h/a.png' },
      handoff: { id: 'h', ownerId: 'user-a', status: 'Draft' },
    });
    mockDb.screen.findMany.mockResolvedValue([{ id: 'screen-2' }, { id: 'screen-3' }]);

    const result = await deleteDraftScreen('screen-1');

    expect(result.ok).toBe(true);
    expect(mockDb.designAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
    expect(mockDb.screen.update).toHaveBeenCalledWith({ where: { id: 'screen-2' }, data: { order: 0 } });
    expect(mockDb.screen.update).toHaveBeenCalledWith({ where: { id: 'screen-3' }, data: { order: 1 } });
    expect(mockDeleteObject).toHaveBeenCalledWith('handoffs/h/a.png');
  });
});

describe('reorderDraftScreens', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a list that isn’t exactly this handoff’s screens', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockDb.handoff.findUnique.mockResolvedValue({
      ownerId: 'user-a',
      status: 'Draft',
      screens: [{ id: 's1' }, { id: 's2' }],
    });

    const missing = await reorderDraftScreens('h', ['s2']);
    const foreign = await reorderDraftScreens('h', ['s2', 'other']);
    const duplicated = await reorderDraftScreens('h', ['s1', 's1']);

    for (const result of [missing, foreign, duplicated]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('invalid_input');
    }
    expect(mockDb.screen.update).not.toHaveBeenCalled();
  });

  it('refuses after the first analysis', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockDb.handoff.findUnique.mockResolvedValue({ ownerId: 'user-a', status: 'Analyzing', screens: [{ id: 's1' }] });

    const result = await reorderDraftScreens('h', ['s1']);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_draft');
  });

  it('saves the new order', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockDb.handoff.findUnique.mockResolvedValue({
      ownerId: 'user-a',
      status: 'Draft',
      screens: [{ id: 's1' }, { id: 's2' }],
    });

    const result = await reorderDraftScreens('h', ['s2', 's1']);

    expect(result.ok).toBe(true);
    expect(mockDb.screen.update).toHaveBeenCalledWith({ where: { id: 's2' }, data: { order: 0 } });
    expect(mockDb.screen.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { order: 1 } });
  });
});
