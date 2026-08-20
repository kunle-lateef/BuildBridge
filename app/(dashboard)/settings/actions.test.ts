import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  user: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
};
const mockAuth = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth, signOut: mockSignOut }));
vi.mock('@/app/(dashboard)/handoffs/[handoffId]/actions', () => ({ deleteHandoff: vi.fn() }));

const { changePassword, updateEmailNotificationsPreference, updateProfile } = await import('./actions');

const SESSION_USER_A = { user: { id: 'user-a', email: 'a@example.com' } };

describe('updateEmailNotificationsPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session, without touching the database', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateEmailNotificationsPreference(false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('updates the preference for the signed-in user', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await updateEmailNotificationsPreference(false);

    expect(result).toEqual({ ok: true, data: { enabled: false } });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { emailNotificationsEnabled: false },
    });
  });
});

function formDataWithName(name: string): FormData {
  const formData = new FormData();
  formData.set('name', name);
  return formData;
}

describe('updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when there is no session, without touching the database', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateProfile(null, formDataWithName('Jane Designer'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('rejects a blank name before ever touching the database', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await updateProfile(null, formDataWithName('   '));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('updates the name for the signed-in user', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await updateProfile(null, formDataWithName('Jane Designer'));

    expect(result).toEqual({ ok: true, data: { name: 'Jane Designer' } });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { name: 'Jane Designer' },
    });
  });
});

function formDataWithPasswords(
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string = newPassword,
): FormData {
  const formData = new FormData();
  formData.set('currentPassword', currentPassword);
  formData.set('newPassword', newPassword);
  formData.set('confirmNewPassword', confirmNewPassword);
  return formData;
}

describe('changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-a',
      email: 'a@example.com',
      passwordHash: bcrypt.hashSync('correct-current-password', 12),
    });
    mockSignOut.mockResolvedValue(undefined);
  });

  it('rejects when there is no session, without touching the database', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await changePassword(null, formDataWithPasswords('correct-current-password', 'newpassword123'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unauthenticated');
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than 8 characters before ever checking the current one', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await changePassword(null, formDataWithPasswords('correct-current-password', 'short'));

    expect(result.ok).toBe(false);
    expect(mockDb.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('rejects a confirmNewPassword that does not match', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await changePassword(
      null,
      formDataWithPasswords('correct-current-password', 'newpassword123', 'somethingelse'),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password without changing anything', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await changePassword(null, formDataWithPasswords('wrong-password', 'newpassword123'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_credentials');
    expect(mockDb.user.update).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('changes the password, bumps sessionVersion, and signs the current session out with a confirmation redirect', async () => {
    mockAuth.mockResolvedValue(SESSION_USER_A);

    const result = await changePassword(null, formDataWithPasswords('correct-current-password', 'newpassword123'));

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { passwordHash: expect.any(String), sessionVersion: { increment: 1 } },
    });
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: '/sign-in?passwordChanged=1' });
    // signOut's real implementation throws to trigger the redirect — the
    // mock doesn't, so this line is reachable in the test but not in
    // production; still confirms the data was correct either way.
    expect(result).toEqual({ ok: true, data: { changed: true } });
  });
});
