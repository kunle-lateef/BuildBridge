import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  shareLink: { findUnique: vi.fn() },
  implementationMark: { upsert: vi.fn() },
  component: { findUnique: vi.fn() },
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
  return new Request(`http://localhost/api/share/${VALID_TOKEN}/marks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(token: string = VALID_TOKEN) {
  return { params: Promise.resolve({ token }) };
}

const VALID_BODY = { findingType: 'Component', findingReference: 'component-1' };

describe('POST /api/share/[token]/marks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true, limit: 30, remaining: 29, resetAt: Date.now() + 1000 });
    mockDb.shareLink.findUnique.mockResolvedValue(ACTIVE_SHARE_LINK);
    mockDb.component.findUnique.mockResolvedValue({ id: 'component-1', handoffId: 'handoff-1' });
    mockDb.implementationMark.upsert.mockResolvedValue({ id: 'mark-1' });
    mockEnqueueNotification.mockResolvedValue(undefined);
  });

  it('returns 404 for a malformed token, without touching the database', async () => {
    const response = await POST(makeRequest(VALID_BODY), params('short'));

    expect(response.status).toBe(404);
    expect(mockDb.shareLink.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for a token that resolves to no active share link', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(VALID_BODY), params());

    expect(response.status).toBe(404);
  });

  it('returns 429 when the per-IP rate limit is exceeded, before ever parsing the body', async () => {
    mockRateLimit.mockResolvedValueOnce({ success: false, limit: 30, remaining: 0, resetAt: Date.now() });

    const response = await POST(makeRequest(VALID_BODY), params());

    expect(response.status).toBe(429);
    expect(mockDb.implementationMark.upsert).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-link rate limit is exceeded even though the per-IP check passed', async () => {
    mockRateLimit
      .mockResolvedValueOnce({ success: true, limit: 30, remaining: 29, resetAt: Date.now() })
      .mockResolvedValueOnce({ success: false, limit: 300, remaining: 0, resetAt: Date.now() });

    const response = await POST(makeRequest(VALID_BODY), params());

    expect(response.status).toBe(429);
    expect(mockDb.implementationMark.upsert).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed body', async () => {
    const response = await POST(makeRequest({ findingType: 'NotAType', findingReference: 'x' }), params());

    expect(response.status).toBe(400);
    expect(mockDb.implementationMark.upsert).not.toHaveBeenCalled();
  });

  it('returns 400 when findingType or findingReference is missing — unlike flags, both are required here', async () => {
    const response = await POST(makeRequest({ findingType: 'Component' }), params());

    expect(response.status).toBe(400);
  });

  it('rejects HandoffIssue as a findingType — implementation marks apply only to Component/Specification/ComponentState/ResponsiveRule', async () => {
    const response = await POST(
      makeRequest({ findingType: 'HandoffIssue', findingReference: 'issue-1' }),
      params(),
    );

    expect(response.status).toBe(400);
    expect(mockDb.implementationMark.upsert).not.toHaveBeenCalled();
  });

  it('returns 400 when the referenced finding belongs to a different handoff than the share link', async () => {
    mockDb.component.findUnique.mockResolvedValue({ id: 'component-1', handoffId: 'some-other-handoff' });

    const response = await POST(makeRequest(VALID_BODY), params());

    expect(response.status).toBe(400);
    expect(mockDb.implementationMark.upsert).not.toHaveBeenCalled();
  });

  it('creates an ImplementationMark and returns 201 for a valid submission', async () => {
    const response = await POST(makeRequest(VALID_BODY), params());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, data: { findingType: 'Component', findingReference: 'component-1' } });
    expect(mockDb.implementationMark.upsert).toHaveBeenCalledWith({
      where: { findingType_findingReference: { findingType: 'Component', findingReference: 'component-1' } },
      create: {
        handoffId: 'handoff-1',
        shareLinkId: 'share-1',
        findingType: 'Component',
        findingReference: 'component-1',
        markedByName: undefined,
      },
      update: {},
    });
  });

  it('is idempotent: a second POST for the same finding still returns 201 without a second finding-check failure', async () => {
    await POST(makeRequest(VALID_BODY), params());
    const second = await POST(makeRequest(VALID_BODY), params());

    expect(second.status).toBe(201);
    expect(mockDb.implementationMark.upsert).toHaveBeenCalledTimes(2);
    // Both calls use the same upsert `update: {}` no-op shape — the first
    // mark always wins, a re-mark is never an overwrite.
    for (const call of mockDb.implementationMark.upsert.mock.calls) {
      expect(call[0].update).toEqual({});
    }
  });

  it('enqueues an implementation-marked notification job on success', async () => {
    mockDb.implementationMark.upsert.mockResolvedValue({ id: 'mark-1' });

    await POST(makeRequest(VALID_BODY), params());

    expect(mockEnqueueNotification).toHaveBeenCalledWith({ kind: 'implementation-marked', implementationMarkId: 'mark-1' });
  });

  it('a Redis/queue failure enqueuing the notification never fails the otherwise-successful submission', async () => {
    mockEnqueueNotification.mockRejectedValue(new Error('redis unreachable'));

    const response = await POST(makeRequest(VALID_BODY), params());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, data: { findingType: 'Component', findingReference: 'component-1' } });
  });
});
