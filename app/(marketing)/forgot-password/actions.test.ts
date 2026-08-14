import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  user: { findUnique: vi.fn() },
  verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
};
const mockSendPasswordResetEmail = vi.fn();
const mockRateLimit = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/email', () => ({ sendPasswordResetEmail: mockSendPasswordResetEmail }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit }));

const { requestPasswordReset } = await import('./actions');

function formDataWith(email: string): FormData {
  const formData = new FormData();
  formData.set('email', email);
  return formData;
}

describe('requestPasswordReset — never reveals whether an account exists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
  });

  it('returns the same ok:true response for an existing account', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'user-a', email: 'real@example.com' });

    const result = await requestPasswordReset(null, formDataWith('real@example.com'));

    expect(result).toEqual({ ok: true, data: { requested: true } });
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockDb.verificationToken.create).toHaveBeenCalledTimes(1);
  });

  it('returns the identical ok:true response for a nonexistent account, without sending an email or creating a token', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    const result = await requestPasswordReset(null, formDataWith('nobody@example.com'));

    expect(result).toEqual({ ok: true, data: { requested: true } });
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockDb.verificationToken.create).not.toHaveBeenCalled();
  });

  it('still returns ok:true when rate-limited, rather than a distinguishing error', async () => {
    mockRateLimit.mockResolvedValue({ success: false });
    mockDb.user.findUnique.mockResolvedValue({ id: 'user-a', email: 'real@example.com' });

    const result = await requestPasswordReset(null, formDataWith('real@example.com'));

    expect(result).toEqual({ ok: true, data: { requested: true } });
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('rejects a malformed email before ever touching the database', async () => {
    const result = await requestPasswordReset(null, formDataWith('not-an-email'));

    expect(result.ok).toBe(false);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it('clears any prior unused token for the email before creating a new one', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'user-a', email: 'real@example.com' });

    await requestPasswordReset(null, formDataWith('real@example.com'));

    expect(mockDb.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: 'real@example.com' },
    });
  });
});
