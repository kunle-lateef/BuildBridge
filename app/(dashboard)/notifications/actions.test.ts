import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/notifications', () => ({
  markNotificationRead: mockMarkNotificationRead,
  markAllNotificationsRead: mockMarkAllNotificationsRead,
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const { markNotificationRead, markAllNotificationsRead } = await import('./actions');

const SESSION_USER_A = { user: { id: 'user-a', email: 'a@example.com' } };

describe('markNotificationRead (dashboard action wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session, without calling into lib/notifications.ts', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await markNotificationRead('notif-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
  });

  it('delegates to lib/notifications.ts scoped to the session user, and revalidates on success', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockMarkNotificationRead.mockResolvedValue({ ok: true, data: { id: 'notif-1' } });

    const result = await markNotificationRead('notif-1');

    expect(mockMarkNotificationRead).toHaveBeenCalledWith('user-a', 'notif-1');
    expect(result).toEqual({ ok: true, data: { id: 'notif-1' } });
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it('does not revalidate when the underlying call fails', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockMarkNotificationRead.mockResolvedValue({ ok: false, error: { code: 'not_found', message: 'Not found.' } });

    await markNotificationRead('notif-1');

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('markAllNotificationsRead (dashboard action wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await markAllNotificationsRead();

    expect(result.ok).toBe(false);
    expect(mockMarkAllNotificationsRead).not.toHaveBeenCalled();
  });

  it('delegates to lib/notifications.ts scoped to the session user', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);
    mockMarkAllNotificationsRead.mockResolvedValue({ ok: true, data: { count: 2 } });

    const result = await markAllNotificationsRead();

    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith('user-a');
    expect(result).toEqual({ ok: true, data: { count: 2 } });
  });
});
