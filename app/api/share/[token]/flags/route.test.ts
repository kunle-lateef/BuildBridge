import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  shareLink: { findUnique: vi.fn() },
  developerFlag: { create: vi.fn() },
  component: { findUnique: vi.fn() },
  handoffIssue: { findUnique: vi.fn() },
};

const mockRateLimit = vi.fn();
const mockEnqueueNotification = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit, clientIp: () => '127.0.0.1' }));
vi.mock('@/lib/notification-queue', () => ({ enqueueNotification: mockEnqueueNotification }));

const { POST } = await import('./route');

const VALID_TOKEN = 'a'.repeat(32);
const ACTIVE_SHARE_LINK = {
  id: 'share-1',
  handoffId: 'handoff-1',
  status: 'Active',
  expiresAt: null,
  tokenReference: 'irrelevant-since-hash-is-mocked-via-db-lookup',
};

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/share/${VALID_TOKEN}/flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(token: string = VALID_TOKEN) {
  return { params: Promise.resolve({ token }) };
}

describe('POST /api/share/[token]/flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, resetAt: Date.now() + 1000 });
    mockDb.shareLink.findUnique.mockResolvedValue(ACTIVE_SHARE_LINK);
    mockEnqueueNotification.mockResolvedValue(undefined);
  });

  it('returns 404 for a malformed token, without touching the database', async () => {
    const response = await POST(makeRequest({ kind: 'Question', message: 'hi' }), params('short'));

    expect(response.status).toBe(404);
    expect(mockDb.shareLink.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for a token that resolves to no active share link', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ kind: 'Question', message: 'hi' }), params());

    expect(response.status).toBe(404);
  });

  it('returns 404 for a revoked share link', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue({ ...ACTIVE_SHARE_LINK, status: 'Revoked' });

    const response = await POST(makeRequest({ kind: 'Question', message: 'hi' }), params());

    expect(response.status).toBe(404);
  });

  it('returns 429 when the per-IP rate limit is exceeded, before ever parsing the body', async () => {
    mockRateLimit.mockResolvedValueOnce({ success: false, limit: 5, remaining: 0, resetAt: Date.now() });

    const response = await POST(makeRequest({ kind: 'Question', message: 'hi' }), params());

    expect(response.status).toBe(429);
    expect(mockDb.developerFlag.create).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-link rate limit is exceeded even though the per-IP check passed', async () => {
    mockRateLimit
      .mockResolvedValueOnce({ success: true, limit: 5, remaining: 4, resetAt: Date.now() })
      .mockResolvedValueOnce({ success: false, limit: 20, remaining: 0, resetAt: Date.now() });

    const response = await POST(makeRequest({ kind: 'Question', message: 'hi' }), params());

    expect(response.status).toBe(429);
    expect(mockDb.developerFlag.create).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed body', async () => {
    const response = await POST(makeRequest({ kind: 'NotAKind', message: '' }), params());

    expect(response.status).toBe(400);
    expect(mockDb.developerFlag.create).not.toHaveBeenCalled();
  });

  it('returns 400 when findingType is present without findingReference (both-or-neither)', async () => {
    const response = await POST(
      makeRequest({ kind: 'Mismatch', message: 'the padding looks off', findingType: 'Component' }),
      params(),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when the referenced finding belongs to a different handoff than the share link', async () => {
    mockDb.component.findUnique.mockResolvedValue({ id: 'component-1', handoffId: 'some-other-handoff' });

    const response = await POST(
      makeRequest({
        kind: 'Mismatch',
        message: 'the padding looks off',
        findingType: 'Component',
        findingReference: 'component-1',
      }),
      params(),
    );

    expect(response.status).toBe(400);
    expect(mockDb.developerFlag.create).not.toHaveBeenCalled();
  });

  it('creates a DeveloperFlag and returns 201 for a valid general submission with no finding reference', async () => {
    mockDb.developerFlag.create.mockResolvedValue({ id: 'flag-1' });

    const response = await POST(
      makeRequest({ kind: 'Question', message: 'What happens on empty state?', submittedByName: 'Dev' }),
      params(),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, data: { id: 'flag-1', trackingToken: expect.any(String) } });
    expect(mockDb.developerFlag.create).toHaveBeenCalledWith({
      data: {
        handoffId: 'handoff-1',
        shareLinkId: 'share-1',
        kind: 'Question',
        message: 'What happens on empty state?',
        submittedByName: 'Dev',
        findingType: undefined,
        findingReference: undefined,
        trackingTokenHash: expect.any(String),
      },
    });
  });

  it('generates a fresh, non-guessable tracking token per submission — never the DeveloperFlag id itself', async () => {
    mockDb.developerFlag.create.mockResolvedValue({ id: 'flag-1' });

    const response = await POST(makeRequest({ kind: 'Question', message: 'What happens on empty state?' }), params());
    const body = await response.json();

    expect(body.data.trackingToken).not.toBe('flag-1');
    expect(body.data.trackingToken).toMatch(/^[A-Za-z0-9_-]{20,64}$/);

    const createCall = mockDb.developerFlag.create.mock.calls[0]?.[0];
    expect(createCall.data.trackingTokenHash).not.toBe(body.data.trackingToken);
  });

  it('creates a DeveloperFlag when the referenced finding does belong to this share link\'s handoff', async () => {
    mockDb.component.findUnique.mockResolvedValue({ id: 'component-1', handoffId: 'handoff-1' });
    mockDb.developerFlag.create.mockResolvedValue({ id: 'flag-2' });

    const response = await POST(
      makeRequest({
        kind: 'Mismatch',
        message: 'the padding looks off',
        findingType: 'Component',
        findingReference: 'component-1',
      }),
      params(),
    );

    expect(response.status).toBe(201);
    expect(mockDb.developerFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ findingType: 'Component', findingReference: 'component-1' }) }),
    );
  });

  it('enqueues a developer-flag-received notification job on success', async () => {
    mockDb.developerFlag.create.mockResolvedValue({ id: 'flag-1' });

    await POST(makeRequest({ kind: 'Question', message: 'What happens on empty state?' }), params());

    expect(mockEnqueueNotification).toHaveBeenCalledWith({ kind: 'developer-flag-received', developerFlagId: 'flag-1' });
  });

  it('a Redis/queue failure enqueuing the notification never fails the otherwise-successful submission', async () => {
    mockDb.developerFlag.create.mockResolvedValue({ id: 'flag-1' });
    mockEnqueueNotification.mockRejectedValue(new Error('redis unreachable'));

    const response = await POST(makeRequest({ kind: 'Question', message: 'What happens on empty state?' }), params());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, data: { id: 'flag-1', trackingToken: expect.any(String) } });
  });
});
