import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  analysisRun: { findUnique: vi.fn() },
  developerFlag: { findUnique: vi.fn() },
  implementationMark: { findUnique: vi.fn() },
  notification: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
};

const mockSendAnalysisRunNotificationEmail = vi.fn();
const mockSendDeveloperFlagNotificationEmail = vi.fn();
const mockSendImplementationMarkedEmail = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/email', () => ({
  sendAnalysisRunNotificationEmail: mockSendAnalysisRunNotificationEmail,
  sendDeveloperFlagNotificationEmail: mockSendDeveloperFlagNotificationEmail,
  sendImplementationMarkedEmail: mockSendImplementationMarkedEmail,
}));

const {
  dispatchAnalysisRunNotification,
  dispatchDeveloperFlagNotification,
  dispatchImplementationMarkNotification,
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = await import('./notifications');

const OWNER = { id: 'user-a', email: 'designer@example.com', emailNotificationsEnabled: true };
const HANDOFF = { id: 'handoff-1', name: 'Checkout redesign', ownerId: 'user-a', owner: OWNER };

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.notification.create.mockResolvedValue({ id: 'notif-1' });
});

describe('dispatchAnalysisRunNotification', () => {
  it('does nothing when the run no longer exists (job outlived its row)', async () => {
    mockDb.analysisRun.findUnique.mockResolvedValue(null);

    await dispatchAnalysisRunNotification('run-1');

    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  it('does nothing for a non-terminal status (Queued/Processing are not notification-worthy)', async () => {
    mockDb.analysisRun.findUnique.mockResolvedValue({ status: 'Processing', handoff: HANDOFF });

    await dispatchAnalysisRunNotification('run-1');

    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  it('creates a Notification and sends email for a Completed run when email is enabled', async () => {
    mockDb.analysisRun.findUnique.mockResolvedValue({ status: 'Completed', handoff: HANDOFF });

    await dispatchAnalysisRunNotification('run-1');

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-a', type: 'AnalysisRunCompleted' }) }),
    );
    expect(mockSendAnalysisRunNotificationEmail).toHaveBeenCalledWith(
      'designer@example.com',
      'Checkout redesign',
      'Completed',
      expect.stringContaining('/handoffs/handoff-1'),
    );
  });

  it('creates the Notification but skips email when the owner has email notifications disabled', async () => {
    mockDb.analysisRun.findUnique.mockResolvedValue({
      status: 'Failed',
      handoff: { ...HANDOFF, owner: { ...OWNER, emailNotificationsEnabled: false } },
    });

    await dispatchAnalysisRunNotification('run-1');

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'AnalysisRunFailed' }) }),
    );
    expect(mockSendAnalysisRunNotificationEmail).not.toHaveBeenCalled();
  });

  it('maps PartiallyCompleted to its own distinct notification type, not reused from Completed', async () => {
    mockDb.analysisRun.findUnique.mockResolvedValue({ status: 'PartiallyCompleted', handoff: HANDOFF });

    await dispatchAnalysisRunNotification('run-1');

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'AnalysisRunPartiallyCompleted' }) }),
    );
  });
});

describe('dispatchDeveloperFlagNotification', () => {
  it('does nothing when the flag no longer exists', async () => {
    mockDb.developerFlag.findUnique.mockResolvedValue(null);

    await dispatchDeveloperFlagNotification('flag-1');

    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  it('creates a Notification deep-linked to the flag anchor and sends email when enabled', async () => {
    mockDb.developerFlag.findUnique.mockResolvedValue({ id: 'flag-1', kind: 'Mismatch', handoff: HANDOFF });

    await dispatchDeveloperFlagNotification('flag-1');

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'DeveloperFlagReceived',
          linkUrl: '/handoffs/handoff-1#flag-flag-1',
        }),
      }),
    );
    expect(mockSendDeveloperFlagNotificationEmail).toHaveBeenCalledWith(
      'designer@example.com',
      'Checkout redesign',
      'Mismatch',
      expect.stringContaining('/handoffs/handoff-1'),
    );
  });
});

describe('dispatchImplementationMarkNotification', () => {
  it('does nothing when the mark no longer exists', async () => {
    mockDb.implementationMark.findUnique.mockResolvedValue(null);

    await dispatchImplementationMarkNotification('mark-1');

    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  it('creates a Notification and sends email when enabled', async () => {
    mockDb.implementationMark.findUnique.mockResolvedValue({ id: 'mark-1', findingType: 'Specification', handoff: HANDOFF });

    await dispatchImplementationMarkNotification('mark-1');

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-a',
          type: 'ImplementationMarked',
          handoffId: 'handoff-1',
          linkUrl: '/handoffs/handoff-1',
        }),
      }),
    );
    expect(mockSendImplementationMarkedEmail).toHaveBeenCalledWith(
      'designer@example.com',
      'Checkout redesign',
      expect.stringContaining('/handoffs/handoff-1'),
    );
  });

  it('skips email when the owner has email notifications disabled', async () => {
    mockDb.implementationMark.findUnique.mockResolvedValue({
      id: 'mark-1',
      findingType: 'Component',
      handoff: { ...HANDOFF, owner: { ...OWNER, emailNotificationsEnabled: false } },
    });

    await dispatchImplementationMarkNotification('mark-1');

    expect(mockDb.notification.create).toHaveBeenCalled();
    expect(mockSendImplementationMarkedEmail).not.toHaveBeenCalled();
  });
});

describe('listNotifications / markNotificationRead / markAllNotificationsRead', () => {
  it('listNotifications defaults to including read notifications, capped at 20', async () => {
    mockDb.notification.findMany.mockResolvedValue([]);

    await listNotifications('user-a');

    expect(mockDb.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-a' }, take: 20 }),
    );
  });

  it('listNotifications filters to unread only when requested', async () => {
    mockDb.notification.findMany.mockResolvedValue([]);

    await listNotifications('user-a', { unreadOnly: true, limit: 5 });

    expect(mockDb.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-a', readAt: null }, take: 5 }),
    );
  });

  it('markNotificationRead rejects with not_found when the notification belongs to a different user', async () => {
    mockDb.notification.findUnique.mockResolvedValue({ id: 'notif-1', userId: 'user-b' });

    const result = await markNotificationRead('user-a', 'notif-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
    expect(mockDb.notification.update).not.toHaveBeenCalled();
  });

  it('markNotificationRead marks it read when owned by the caller', async () => {
    mockDb.notification.findUnique.mockResolvedValue({ id: 'notif-1', userId: 'user-a' });

    const result = await markNotificationRead('user-a', 'notif-1');

    expect(result).toEqual({ ok: true, data: { id: 'notif-1' } });
    expect(mockDb.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { readAt: expect.any(Date) },
    });
  });

  it('markAllNotificationsRead scopes the updateMany to the caller and only unread rows', async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 3 });

    const result = await markAllNotificationsRead('user-a');

    expect(result).toEqual({ ok: true, data: { count: 3 } });
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-a', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe('createNotification', () => {
  it('persists exactly the given input as the Notification row', async () => {
    mockDb.notification.create.mockResolvedValue({ id: 'notif-1' });

    await createNotification({
      userId: 'user-a',
      type: 'DeveloperFlagReceived',
      handoffId: 'handoff-1',
      title: 'Title',
      body: 'Body',
      linkUrl: '/handoffs/handoff-1',
    });

    expect(mockDb.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a',
        type: 'DeveloperFlagReceived',
        handoffId: 'handoff-1',
        title: 'Title',
        body: 'Body',
        linkUrl: '/handoffs/handoff-1',
      },
    });
  });
});
