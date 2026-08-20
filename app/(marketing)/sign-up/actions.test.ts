import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSignIn = vi.fn();
const mockRateLimit = vi.fn();
const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('@/lib/auth', () => ({ signIn: mockSignIn }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit }));
vi.mock('@/lib/db', () => ({
  db: { user: { create: mockUserCreate, findUnique: mockUserFindUnique } },
}));

const { signUp } = await import('./actions');

function formDataWith(overrides: Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>> = {}): FormData {
  const formData = new FormData();
  formData.set('name', overrides.name ?? 'Jane Designer');
  formData.set('email', overrides.email ?? 'jane@example.com');
  formData.set('password', overrides.password ?? 'password123');
  formData.set('confirmPassword', overrides.confirmPassword ?? 'password123');
  return formData;
}

describe('signUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: 'user-1' });
    mockSignIn.mockResolvedValue(undefined);
  });

  it('rejects malformed input before checking the rate limit', async () => {
    const result = await signUp(null, formDataWith({ email: 'not-an-email' }));

    expect(result.ok).toBe(false);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it('rejects with rate_limited before ever creating the account', async () => {
    mockRateLimit.mockResolvedValue({ success: false });

    const result = await signUp(null, formDataWith());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('rate_limited');
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it('does not reveal that an account already exists', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'existing-user' });

    const result = await signUp(null, formDataWith());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it('creates the account and signs the user in on success', async () => {
    const result = await signUp(null, formDataWith({ email: 'jane@example.com', password: 'password123' }));

    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { name: 'Jane Designer', email: 'jane@example.com', passwordHash: expect.any(String) },
    });
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'jane@example.com',
      password: 'password123',
      redirect: false,
    });
    expect(result).toEqual({ ok: true, data: { success: true } });
  });

  it('still reports success if auto sign-in fails after the account was created', async () => {
    mockSignIn.mockRejectedValue(new Error('session store unavailable'));

    const result = await signUp(null, formDataWith());

    expect(mockUserCreate).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { success: true } });
  });
});
