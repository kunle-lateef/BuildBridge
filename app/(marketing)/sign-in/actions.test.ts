import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSignIn = vi.fn();
const mockRateLimit = vi.fn();

vi.mock('@/lib/auth', () => ({ signIn: mockSignIn }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit }));

const { signInAction } = await import('./actions');

function formDataWith(email: string, password: string): FormData {
  const formData = new FormData();
  formData.set('email', email);
  formData.set('password', password);
  return formData;
}

describe('signInAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
  });

  it('rejects with rate_limited before ever calling signIn, when the limit is exceeded', async () => {
    mockRateLimit.mockResolvedValue({ success: false });

    const result = await signInAction(null, formDataWith('a@example.com', 'password123'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('rate_limited');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('rate-limits per email address', async () => {
    await signInAction(null, formDataWith('a@example.com', 'password123'));

    expect(mockRateLimit).toHaveBeenCalledWith('sign-in:a@example.com', expect.any(Number), expect.any(Number));
  });

  it('rejects malformed input before checking the rate limit', async () => {
    const result = await signInAction(null, formDataWith('not-an-email', 'password123'));

    expect(result.ok).toBe(false);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it('succeeds when under the rate limit and signIn resolves', async () => {
    mockSignIn.mockResolvedValue(undefined);

    const result = await signInAction(null, formDataWith('a@example.com', 'password123'));

    expect(result).toEqual({ ok: true, data: { success: true } });
  });
});
