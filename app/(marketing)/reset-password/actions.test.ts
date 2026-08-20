import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashSecureToken } from '@/lib/tokens';

const mockDb = {
  user: { update: vi.fn().mockResolvedValue({}) },
  verificationToken: {
    findUnique: vi.fn(),
    delete: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn(async (queries: unknown[]) => Promise.all(queries)),
};
const mockSignIn = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ signIn: mockSignIn }));

const { resetPassword } = await import('./actions');

function formDataWith(token: string, password: string, confirmPassword: string = password): FormData {
  const formData = new FormData();
  formData.set('token', token);
  formData.set('password', password);
  formData.set('confirmPassword', confirmPassword);
  return formData;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (queries: unknown[]) => Promise.all(queries));
    mockSignIn.mockResolvedValue(undefined);
  });

  it('rejects a token that does not exist', async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue(null);

    const result = await resetPassword(null, formDataWith('bogus-token', 'newpassword123'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_token');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an expired token, even though it still exists', async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      identifier: 'user@example.com',
      token: hashSecureToken('expired-token'),
      expires: daysFromNow(-1),
    });

    const result = await resetPassword(null, formDataWith('expired-token', 'newpassword123'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_token');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 8 characters before ever looking up the token', async () => {
    const result = await resetPassword(null, formDataWith('some-token', 'short'));

    expect(result.ok).toBe(false);
    expect(mockDb.verificationToken.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a confirmPassword that doesn’t match, before ever looking up the token', async () => {
    const result = await resetPassword(null, formDataWith('some-token', 'newpassword123', 'somethingelse'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockDb.verificationToken.findUnique).not.toHaveBeenCalled();
  });

  it('updates the password, bumps sessionVersion, and consumes the token exactly once for a valid, unexpired token', async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      identifier: 'user@example.com',
      token: hashSecureToken('valid-token'),
      expires: daysFromNow(1),
    });

    const result = await resetPassword(null, formDataWith('valid-token', 'newpassword123'));

    expect(result.ok).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'user@example.com' },
        data: expect.objectContaining({ sessionVersion: { increment: 1 } }),
      }),
    );
    expect(mockDb.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: hashSecureToken('valid-token') },
    });
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'newpassword123',
      redirect: false,
    });
  });

  it('still reports success if auto sign-in fails after the password was reset', async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      identifier: 'user@example.com',
      token: hashSecureToken('valid-token'),
      expires: daysFromNow(1),
    });
    mockSignIn.mockRejectedValue(new Error('session store unavailable'));

    const result = await resetPassword(null, formDataWith('valid-token', 'newpassword123'));

    expect(mockDb.user.update).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { reset: true } });
  });
});
