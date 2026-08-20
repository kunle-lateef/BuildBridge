import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  handoff: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), delete: vi.fn(), create: vi.fn() },
  designerNote: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  designerDecision: { deleteMany: vi.fn(), create: vi.fn() },
  analysisRun: { deleteMany: vi.fn() },
  designAsset: { findMany: vi.fn() },
  user: { findUniqueOrThrow: vi.fn() },
  handoffIssue: { count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  component: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  specification: { createMany: vi.fn() },
  componentState: { createMany: vi.fn() },
  responsiveRule: { createMany: vi.fn() },
  shareLink: { create: vi.fn() },
  screen: { findMany: vi.fn() },
  screenFlow: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  developerFlag: { findUnique: vi.fn(), update: vi.fn() },
  // Supports both Prisma $transaction call forms used across this file's
  // actions: an array of promises (deleteHandoff), and a callback receiving
  // a tx client (recordDesignerDecision, bulkRecordDecision) — mockDb itself
  // is passed as `tx` since it already exposes the same model methods.
  $transaction: vi.fn((arg: unknown) =>
    typeof arg === 'function' ? arg(mockDb) : Promise.all(arg as Promise<unknown>[]),
  ),
};
const mockAuth = vi.fn();
const mockDeleteObject = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/storage', () => ({
  deleteObject: mockDeleteObject,
  getObjectBytes: vi.fn(),
  putObject: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  createSignedReadUrl: vi.fn(),
}));

const {
  addDesignerNote,
  archiveHandoff,
  bulkRecordDecision,
  createScreenFlow,
  createShareLink,
  deleteHandoff,
  deleteScreenFlow,
  duplicateHandoff,
  editDesignerNote,
  unarchiveHandoff,
  updateDeveloperFlagStatus,
} = await import('./actions');

const SESSION_USER_A = { user: { id: 'user-a', email: 'a@example.com' } };

describe('addDesignerNote / editDesignerNote — ownership-check template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await addDesignerNote({ handoffId: 'handoff-1', content: 'A note' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockDb.handoff.findUnique).not.toHaveBeenCalled();
  });

  it('addDesignerNote: rejects with not_found when the handoff belongs to a different user — never revealing it exists', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b' });

    const result = await addDesignerNote({ handoffId: 'handoff-1', content: 'A note' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.designerNote.create).not.toHaveBeenCalled();
  });

  it('addDesignerNote: rejects with the identical not_found error when the handoff does not exist at all', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue(null);

    const result = await addDesignerNote({ handoffId: 'nonexistent', content: 'A note' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
      // Same message/code as the "belongs to someone else" case above —
      // a crafted ID can't distinguish "doesn't exist" from "not yours."
      expect(result.error.message).toBe('Handoff not found.');
    }
  });

  it('addDesignerNote: succeeds and persists the note when the session user owns the handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.designerNote.create.mockResolvedValue({ id: 'note-1' });

    const result = await addDesignerNote({ handoffId: 'handoff-1', content: 'Use the existing button component' });

    expect(result.ok).toBe(true);
    expect(mockDb.designerNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ handoffId: 'handoff-1', createdBy: 'user-a' }),
      }),
    );
  });

  it('editDesignerNote: rejects with not_found when the note belongs to a handoff owned by a different user', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.designerNote.findUnique.mockResolvedValue({
      id: 'note-1',
      handoffId: 'handoff-1',
      handoff: { ownerId: 'user-b' },
    });

    const result = await editDesignerNote({ noteId: 'note-1', content: 'Edited' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.designerNote.update).not.toHaveBeenCalled();
  });

  it('editDesignerNote: succeeds when the session user owns the note\'s handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.designerNote.findUnique.mockResolvedValue({
      id: 'note-1',
      handoffId: 'handoff-1',
      handoff: { ownerId: 'user-a' },
    });
    mockDb.designerNote.update.mockResolvedValue({ id: 'note-1' });

    const result = await editDesignerNote({ noteId: 'note-1', content: 'Edited content' });

    expect(result.ok).toBe(true);
    expect(mockDb.designerNote.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: { content: 'Edited content' },
    });
  });
});

describe('archiveHandoff / unarchiveHandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archiveHandoff: rejects with not_found when the handoff belongs to a different user', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b' });

    const result = await archiveHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.handoff.update).not.toHaveBeenCalled();
  });

  it('archiveHandoff: sets status to Archived when the session user owns the handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.handoff.update.mockResolvedValue({ id: 'handoff-1', status: 'Archived' });

    const result = await archiveHandoff('handoff-1');

    expect(result.ok).toBe(true);
    expect(mockDb.handoff.update).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: { status: 'Archived' },
    });
  });

  it('unarchiveHandoff: rejects with not_found when the handoff belongs to a different user, before ever checking the cap', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b' });

    const result = await unarchiveHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockDb.handoff.update).not.toHaveBeenCalled();
  });

  it('unarchiveHandoff: rejects with handoff_cap_reached when unarchiving would exceed the plan cap, without applying the update', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({ planTier: 'Free' });
    mockDb.handoff.count.mockResolvedValue(3); // Free tier cap is 3

    const result = await unarchiveHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('handoff_cap_reached');
    expect(mockDb.handoff.update).not.toHaveBeenCalled();
  });

  it('unarchiveHandoff: sets status back to Draft when under the cap', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({ planTier: 'Free' });
    mockDb.handoff.count.mockResolvedValue(1);
    mockDb.handoff.update.mockResolvedValue({ id: 'handoff-1', status: 'Draft' });

    const result = await unarchiveHandoff('handoff-1');

    expect(result.ok).toBe(true);
    expect(mockDb.handoff.update).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: { status: 'Draft' },
    });
  });
});

describe('createShareLink — readiness hard-gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with not_ready when the handoff has never been analyzed, even with zero issues — the readinessScore-null loophole', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', readinessScore: null });

    const result = await createShareLink({ handoffId: 'handoff-1' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_ready');
    // Short-circuits before even checking issues — a never-analyzed handoff
    // trivially has zero, which would otherwise pass the Critical check.
    expect(mockDb.handoffIssue.count).not.toHaveBeenCalled();
    expect(mockDb.shareLink.create).not.toHaveBeenCalled();
  });

  it('rejects with not_ready when the handoff has an unresolved Critical issue, without creating a link', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', readinessScore: 62 });
    mockDb.handoffIssue.count.mockResolvedValue(2);

    const result = await createShareLink({ handoffId: 'handoff-1' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_ready');
      expect(result.error.message).toContain('2 unresolved critical issues');
    }
    expect(mockDb.shareLink.create).not.toHaveBeenCalled();
  });

  it('creates the link and marks the handoff Shared when there are no unresolved Critical issues', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', readinessScore: 82 });
    mockDb.handoffIssue.count.mockResolvedValue(0);
    mockDb.shareLink.create.mockResolvedValue({ id: 'share-1' });

    const result = await createShareLink({ handoffId: 'handoff-1' });

    expect(result.ok).toBe(true);
    expect(mockDb.shareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ handoffId: 'handoff-1' }) }),
    );
    expect(mockDb.handoff.update).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: { status: 'Shared' },
    });
  });
});

describe('deleteHandoff — real, hard delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation((arg: unknown) => Promise.all(arg as Promise<unknown>[]));
  });

  it('rejects with not_found when the handoff belongs to a different user, without deleting anything', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b' });

    const result = await deleteHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('deletes DesignerDecision first, then the Handoff, then AnalysisRun rows last (FK order: HandoffIssue.sourceAnalysisRunId only clears via the Handoff cascade), then cleans up storage objects', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.designAsset.findMany.mockResolvedValue([
      { storageReference: 'handoffs/handoff-1/asset-1.png' },
      { storageReference: 'handoffs/handoff-1/asset-2.png' },
    ]);
    mockDeleteObject.mockResolvedValue(undefined);
    const callOrder: string[] = [];
    mockDb.designerDecision.deleteMany.mockImplementation(() => {
      callOrder.push('designerDecision');
      return Promise.resolve();
    });
    mockDb.handoff.delete.mockImplementation(() => {
      callOrder.push('handoff');
      return Promise.resolve();
    });
    mockDb.analysisRun.deleteMany.mockImplementation(() => {
      callOrder.push('analysisRun');
      return Promise.resolve();
    });

    const result = await deleteHandoff('handoff-1');

    expect(result).toEqual({ ok: true, data: { deleted: true } });
    expect(mockDb.designerDecision.deleteMany).toHaveBeenCalledWith({ where: { handoffId: 'handoff-1' } });
    expect(mockDb.analysisRun.deleteMany).toHaveBeenCalledWith({ where: { handoffId: 'handoff-1' } });
    expect(mockDb.handoff.delete).toHaveBeenCalledWith({ where: { id: 'handoff-1' } });
    expect(callOrder).toEqual(['designerDecision', 'handoff', 'analysisRun']);
    expect(mockDeleteObject).toHaveBeenCalledWith('handoffs/handoff-1/asset-1.png');
    expect(mockDeleteObject).toHaveBeenCalledWith('handoffs/handoff-1/asset-2.png');
  });

  it('still reports success when a storage object fails to delete — the DB rows are already gone, which is what matters', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.designAsset.findMany.mockResolvedValue([{ storageReference: 'handoffs/handoff-1/asset-1.png' }]);
    mockDeleteObject.mockRejectedValue(new Error('object not found'));

    const result = await deleteHandoff('handoff-1');

    expect(result.ok).toBe(true);
  });

  it('rejects with server_error and deletes nothing if the DB transaction itself fails', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.designAsset.findMany.mockResolvedValue([]);
    mockDb.$transaction.mockRejectedValue(new Error('constraint violation'));

    const result = await deleteHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('server_error');
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });
});

describe('bulkRecordDecision — one provenance tier at a time, never mixed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: typeof mockDb) => unknown)(mockDb) : Promise.all(arg as Promise<unknown>[]),
    );
    mockDb.handoffIssue.findMany.mockResolvedValue([]);
  });

  it('rejects the whole batch when one id does not resolve, without deciding anything', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', status: 'NeedsReview' });
    // Only one of the two requested ids actually exists.
    mockDb.handoffIssue.findMany.mockResolvedValue([
      { id: 'issue-1', handoffId: 'handoff-1', provenance: 'Detected', status: 'Open' },
    ]);

    const result = await bulkRecordDecision({
      handoffId: 'handoff-1',
      findingType: 'HandoffIssue',
      provenance: 'Detected',
      action: 'Confirm',
      findingReferences: ['issue-1', 'issue-2'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockDb.designerDecision.create).not.toHaveBeenCalled();
  });

  it('rejects the whole batch when a fetched row belongs to a different handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', status: 'NeedsReview' });
    mockDb.handoffIssue.findMany.mockResolvedValue([
      { id: 'issue-1', handoffId: 'handoff-1', provenance: 'Detected', status: 'Open' },
      { id: 'issue-2', handoffId: 'someone-elses-handoff', provenance: 'Detected', status: 'Open' },
    ]);

    const result = await bulkRecordDecision({
      handoffId: 'handoff-1',
      findingType: 'HandoffIssue',
      provenance: 'Detected',
      action: 'Confirm',
      findingReferences: ['issue-1', 'issue-2'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.designerDecision.create).not.toHaveBeenCalled();
  });

  it('rejects the whole batch when a finding does not actually match the claimed provenance', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', status: 'NeedsReview' });
    mockDb.handoffIssue.findMany.mockResolvedValue([
      { id: 'issue-1', handoffId: 'handoff-1', provenance: 'Detected', status: 'Open' },
      { id: 'issue-2', handoffId: 'handoff-1', provenance: 'Suggested', status: 'Open' },
    ]);

    const result = await bulkRecordDecision({
      handoffId: 'handoff-1',
      findingType: 'HandoffIssue',
      provenance: 'Detected',
      action: 'Confirm',
      findingReferences: ['issue-1', 'issue-2'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockDb.designerDecision.create).not.toHaveBeenCalled();
  });

  it('decides every matching Open finding and silently skips one already acted on, recomputing readiness once', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', status: 'NeedsReview' });
    mockDb.handoffIssue.findMany.mockImplementation(({ where }: { where: { id?: { in: string[] } } }) => {
      // First call (inside fetchFindingsForBulk) is scoped by id; the second
      // (inside recomputeHandoffReadiness -> computeReadiness) has no id filter.
      if (where.id) {
        return Promise.resolve([
          { id: 'issue-1', handoffId: 'handoff-1', provenance: 'Detected', status: 'Open' },
          { id: 'issue-2', handoffId: 'handoff-1', provenance: 'Detected', status: 'InReview' },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await bulkRecordDecision({
      handoffId: 'handoff-1',
      findingType: 'HandoffIssue',
      provenance: 'Detected',
      action: 'Confirm',
      findingReferences: ['issue-1', 'issue-2'],
    });

    expect(result).toEqual({ ok: true, data: { decidedCount: 1, skippedCount: 1 } });
    expect(mockDb.designerDecision.create).toHaveBeenCalledTimes(1);
    expect(mockDb.designerDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ findingReference: 'issue-1', note: 'Bulk action' }) }),
    );
    expect(mockDb.handoffIssue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'issue-1' } }),
    );
    expect(mockDb.handoff.update).toHaveBeenCalledTimes(1);
  });
});

describe('createScreenFlow / deleteScreenFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a screen leading to itself, without touching the database', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await createScreenFlow({
      handoffId: 'handoff-1',
      sourceScreenId: 'screen-1',
      targetScreenId: 'screen-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockDb.handoff.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when one of the two screens does not belong to the handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    // Only one of the two requested screens actually resolves under this handoff.
    mockDb.screen.findMany.mockResolvedValue([{ id: 'screen-1' }]);

    const result = await createScreenFlow({
      handoffId: 'handoff-1',
      sourceScreenId: 'screen-1',
      targetScreenId: 'screen-2',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.screenFlow.create).not.toHaveBeenCalled();
  });

  it('creates the flow when both screens belong to the owned handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });
    mockDb.screen.findMany.mockResolvedValue([{ id: 'screen-1' }, { id: 'screen-2' }]);
    mockDb.screenFlow.create.mockResolvedValue({ id: 'flow-1' });

    const result = await createScreenFlow({
      handoffId: 'handoff-1',
      sourceScreenId: 'screen-1',
      targetScreenId: 'screen-2',
      label: 'Tap "Checkout"',
    });

    expect(result).toEqual({ ok: true, data: { screenFlowId: 'flow-1' } });
    expect(mockDb.screenFlow.create).toHaveBeenCalledWith({
      data: {
        handoffId: 'handoff-1',
        sourceScreenId: 'screen-1',
        targetScreenId: 'screen-2',
        label: 'Tap "Checkout"',
        createdBy: 'user-a',
      },
    });
  });

  it('deleteScreenFlow rejects when the flow belongs to a different user’s handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.screenFlow.findUnique.mockResolvedValue({ id: 'flow-1', handoffId: 'handoff-1' });
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b' });

    const result = await deleteScreenFlow('flow-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.screenFlow.delete).not.toHaveBeenCalled();
  });

  it('deleteScreenFlow deletes when the caller owns the handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.screenFlow.findUnique.mockResolvedValue({ id: 'flow-1', handoffId: 'handoff-1' });
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });

    const result = await deleteScreenFlow('flow-1');

    expect(result).toEqual({ ok: true, data: { deleted: true } });
    expect(mockDb.screenFlow.delete).toHaveBeenCalledWith({ where: { id: 'flow-1' } });
  });
});

describe('updateDeveloperFlagStatus — the only path that transitions a DeveloperFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session, without touching the database', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateDeveloperFlagStatus({ developerFlagId: 'flag-1', status: 'Acknowledged' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockDb.developerFlag.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an invalid status value', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await updateDeveloperFlagStatus({ developerFlagId: 'flag-1', status: 'Deleted' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
  });

  it('rejects with not_found when the flag does not exist', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.developerFlag.findUnique.mockResolvedValue(null);

    const result = await updateDeveloperFlagStatus({ developerFlagId: 'flag-1', status: 'Resolved' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.developerFlag.update).not.toHaveBeenCalled();
  });

  it('rejects with not_found (never revealing it exists) when the flag belongs to a different user’s handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.developerFlag.findUnique.mockResolvedValue({ id: 'flag-1', handoffId: 'handoff-1' });
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b' });

    const result = await updateDeveloperFlagStatus({ developerFlagId: 'flag-1', status: 'Resolved' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.developerFlag.update).not.toHaveBeenCalled();
  });

  it('updates the status when the caller owns the handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.developerFlag.findUnique.mockResolvedValue({ id: 'flag-1', handoffId: 'handoff-1' });
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a' });

    const result = await updateDeveloperFlagStatus({ developerFlagId: 'flag-1', status: 'Resolved' });

    expect(result).toEqual({ ok: true, data: { developerFlagId: 'flag-1', status: 'Resolved' } });
    expect(mockDb.developerFlag.update).toHaveBeenCalledWith({
      where: { id: 'flag-1' },
      data: { status: 'Resolved' },
    });
  });
});

describe('duplicateHandoff — component/spec/state skeleton only, never screens or history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session, without touching the database', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await duplicateHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockDb.handoff.findUnique).not.toHaveBeenCalled();
  });

  it('rejects with not_found when the source handoff belongs to a different user', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-b', name: 'Someone else\'s' });

    const result = await duplicateHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.handoff.create).not.toHaveBeenCalled();
  });

  it('rejects with handoff_cap_reached when the owner is already at their plan cap', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', name: 'Source' });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({ planTier: 'Free' });
    mockDb.handoff.count.mockResolvedValue(3);

    const result = await duplicateHandoff('handoff-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('handoff_cap_reached');
    expect(mockDb.handoff.create).not.toHaveBeenCalled();
  });

  it('copies each component along with its specifications, states, and component-scoped responsive rules into a new Draft handoff', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({
      id: 'handoff-1',
      ownerId: 'user-a',
      name: 'Design system',
      description: 'A component library',
    });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({ planTier: 'Free' });
    mockDb.handoff.count.mockResolvedValue(0);
    mockDb.component.findMany.mockResolvedValue([
      {
        id: 'component-1',
        name: 'Primary Button',
        type: 'button',
        description: 'CTA button',
        confidence: 0.9,
        provenance: 'Detected',
        specifications: [
          { category: 'Radius', property: 'corner-radius', value: '8', unit: 'px', confidence: 1, provenance: 'Detected' },
        ],
        states: [{ name: 'Hover', description: 'Darker fill', confidence: 0.7, provenance: 'Inferred' }],
        responsiveRules: [
          { viewportCategory: 'Mobile', behavior: 'Full width', confidence: 0.6, provenance: 'Suggested' },
        ],
      },
    ]);
    mockDb.handoff.create.mockResolvedValue({ id: 'new-handoff-1' });
    mockDb.component.create.mockResolvedValue({ id: 'new-component-1' });

    const result = await duplicateHandoff('handoff-1');

    expect(result).toEqual({ ok: true, data: { id: 'new-handoff-1' } });
    expect(mockDb.handoff.create).toHaveBeenCalledWith({
      data: { ownerId: 'user-a', name: 'Design system (copy)', description: 'A component library' },
    });
    expect(mockDb.component.create).toHaveBeenCalledWith({
      data: {
        handoffId: 'new-handoff-1',
        name: 'Primary Button',
        type: 'button',
        description: 'CTA button',
        confidence: 0.9,
        provenance: 'Detected',
      },
    });
    expect(mockDb.specification.createMany).toHaveBeenCalledWith({
      data: [
        {
          componentId: 'new-component-1',
          category: 'Radius',
          property: 'corner-radius',
          value: '8',
          unit: 'px',
          confidence: 1,
          provenance: 'Detected',
        },
      ],
    });
    expect(mockDb.componentState.createMany).toHaveBeenCalledWith({
      data: [
        { componentId: 'new-component-1', name: 'Hover', description: 'Darker fill', confidence: 0.7, provenance: 'Inferred' },
      ],
    });
    expect(mockDb.responsiveRule.createMany).toHaveBeenCalledWith({
      data: [
        { componentId: 'new-component-1', viewportCategory: 'Mobile', behavior: 'Full width', confidence: 0.6, provenance: 'Suggested' },
      ],
    });
  });

  it('never touches Screen, DesignAsset, AnalysisRun, or DesignerDecision tables', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockDb.handoff.findUnique.mockResolvedValue({ id: 'handoff-1', ownerId: 'user-a', name: 'Source', description: null });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({ planTier: 'Free' });
    mockDb.handoff.count.mockResolvedValue(0);
    mockDb.component.findMany.mockResolvedValue([]);
    mockDb.handoff.create.mockResolvedValue({ id: 'new-handoff-1' });

    await duplicateHandoff('handoff-1');

    expect(mockDb.screen.findMany).not.toHaveBeenCalled();
    expect(mockDb.designAsset.findMany).not.toHaveBeenCalled();
    expect(mockDb.analysisRun.deleteMany).not.toHaveBeenCalled();
    expect(mockDb.designerDecision.create).not.toHaveBeenCalled();
  });
});
