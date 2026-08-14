import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  handoff: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
  designerNote: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  user: { findUniqueOrThrow: vi.fn() },
};
const mockAuth = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { addDesignerNote, archiveHandoff, editDesignerNote, unarchiveHandoff } = await import('./actions');

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
