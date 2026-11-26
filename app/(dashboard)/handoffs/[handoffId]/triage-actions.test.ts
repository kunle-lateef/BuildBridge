import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  developerFlag: { findUnique: vi.fn(), update: vi.fn() },
  handoff: { findUnique: vi.fn() },
  component: { count: vi.fn() },
  specification: { count: vi.fn() },
  componentState: { count: vi.fn() },
  responsiveRule: { count: vi.fn() },
};
const mockAuth = vi.fn();
const mockRateLimit = vi.fn();
const mockSendContinueReviewEmail = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit }));
vi.mock('@/lib/email', () => ({ sendContinueReviewEmail: mockSendContinueReviewEmail }));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_APP_URL: 'https://app.example.test' } }));

const { replyToDeveloperFlag } = await import('./developer-flag-actions');
const { emailReviewLink } = await import('./triage-actions');

const OWNER = { user: { id: 'user-a', email: 'designer@example.test' } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('replyToDeveloperFlag (phone triage "Reply and resolve")', () => {
  it('needs a session', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await replyToDeveloperFlag({ developerFlagId: 'flag-1', reply: 'Not sticky.' });
    expect(result.ok).toBe(false);
    expect(mockDb.developerFlag.update).not.toHaveBeenCalled();
  });

  it('refuses an empty reply', async () => {
    mockAuth.mockResolvedValue(OWNER);
    const result = await replyToDeveloperFlag({ developerFlagId: 'flag-1', reply: '   ' });
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid_input' } });
  });

  it('answers not-found for a flag on someone else’s handoff', async () => {
    mockAuth.mockResolvedValue(OWNER);
    mockDb.developerFlag.findUnique.mockResolvedValue({ handoffId: 'h1', handoff: { ownerId: 'user-b' } });
    const result = await replyToDeveloperFlag({ developerFlagId: 'flag-1', reply: 'Not sticky.' });
    expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(mockDb.developerFlag.update).not.toHaveBeenCalled();
  });

  it('stores the reply and resolves the flag', async () => {
    mockAuth.mockResolvedValue(OWNER);
    mockDb.developerFlag.findUnique.mockResolvedValue({ handoffId: 'h1', handoff: { ownerId: 'user-a' } });
    const result = await replyToDeveloperFlag({ developerFlagId: 'flag-1', reply: '  Not sticky.  ' });
    expect(result.ok).toBe(true);
    expect(mockDb.developerFlag.update).toHaveBeenCalledWith({
      where: { id: 'flag-1' },
      data: { reply: 'Not sticky.', repliedAt: expect.any(Date), status: 'Resolved' },
    });
  });
});

describe('emailReviewLink (phone triage "Email me a link")', () => {
  it('needs a session', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await emailReviewLink({ handoffId: 'h1' });
    expect(result.ok).toBe(false);
    expect(mockSendContinueReviewEmail).not.toHaveBeenCalled();
  });

  it('only sends for the handoff’s owner', async () => {
    mockAuth.mockResolvedValue(OWNER);
    mockDb.handoff.findUnique.mockResolvedValue({ ownerId: 'user-b', name: 'Theirs' });
    const result = await emailReviewLink({ handoffId: 'h1' });
    expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(mockSendContinueReviewEmail).not.toHaveBeenCalled();
  });

  it('stops at the rate limit', async () => {
    mockAuth.mockResolvedValue(OWNER);
    mockDb.handoff.findUnique.mockResolvedValue({ ownerId: 'user-a', name: 'Ledger · Checkout v3' });
    mockRateLimit.mockResolvedValue({ success: false });
    const result = await emailReviewLink({ handoffId: 'h1' });
    expect(result).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
    expect(mockSendContinueReviewEmail).not.toHaveBeenCalled();
  });

  it('emails the signed-in designer a link to the Review page with the values left', async () => {
    mockAuth.mockResolvedValue(OWNER);
    mockDb.handoff.findUnique.mockResolvedValue({ ownerId: 'user-a', name: 'Ledger · Checkout v3' });
    mockRateLimit.mockResolvedValue({ success: true });
    mockDb.component.count.mockResolvedValue(2);
    mockDb.specification.count.mockResolvedValue(20);
    mockDb.componentState.count.mockResolvedValue(3);
    mockDb.responsiveRule.count.mockResolvedValue(1);
    const result = await emailReviewLink({ handoffId: 'h1' });
    expect(result).toEqual({ ok: true, data: { valuesLeft: 26 } });
    expect(mockSendContinueReviewEmail).toHaveBeenCalledWith('designer@example.test', {
      handoffName: 'Ledger · Checkout v3',
      valuesLeft: 26,
      reviewUrl: 'https://app.example.test/handoffs/h1',
    });
  });
});
