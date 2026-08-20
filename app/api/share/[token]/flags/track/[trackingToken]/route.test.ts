import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  shareLink: { findUnique: vi.fn() },
  developerFlag: { findUnique: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { GET } = await import('./route');

const VALID_TOKEN = 'a'.repeat(32);
const VALID_TRACKING_TOKEN = 'b'.repeat(32);
const ACTIVE_SHARE_LINK = { id: 'share-1', handoffId: 'handoff-1', status: 'Active', expiresAt: null };

function params(token: string = VALID_TOKEN, trackingToken: string = VALID_TRACKING_TOKEN) {
  return { params: Promise.resolve({ token, trackingToken }) };
}

describe('GET /api/share/[token]/flags/track/[trackingToken]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.shareLink.findUnique.mockResolvedValue(ACTIVE_SHARE_LINK);
  });

  it('returns 404 for a malformed share token', async () => {
    const response = await GET(new Request('http://localhost'), params('short'));

    expect(response.status).toBe(404);
    expect(mockDb.shareLink.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for a malformed tracking token', async () => {
    const response = await GET(new Request('http://localhost'), params(VALID_TOKEN, 'short'));

    expect(response.status).toBe(404);
    expect(mockDb.developerFlag.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for a share token that does not resolve to an active link', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost'), params());

    expect(response.status).toBe(404);
    expect(mockDb.developerFlag.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when no flag matches the tracking token', async () => {
    mockDb.developerFlag.findUnique.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost'), params());

    expect(response.status).toBe(404);
  });

  it('returns 404 when the matched flag belongs to a different handoff than the presented share token — the two-factor check', async () => {
    mockDb.developerFlag.findUnique.mockResolvedValue({
      handoffId: 'some-other-handoff',
      status: 'Open',
      kind: 'Question',
      createdAt: new Date(),
    });

    const response = await GET(new Request('http://localhost'), params());

    expect(response.status).toBe(404);
  });

  it('returns the flag status when both the share token and tracking token are valid and match the same handoff', async () => {
    const createdAt = new Date('2026-08-15T00:00:00Z');
    mockDb.developerFlag.findUnique.mockResolvedValue({
      handoffId: 'handoff-1',
      status: 'Acknowledged',
      kind: 'Mismatch',
      createdAt,
    });

    const response = await GET(new Request('http://localhost'), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: { status: 'Acknowledged', kind: 'Mismatch', createdAt: createdAt.toISOString() },
    });
  });

  it('looks up by the hash of the tracking token, never the raw token itself', async () => {
    mockDb.developerFlag.findUnique.mockResolvedValue(null);

    await GET(new Request('http://localhost'), params());

    const call = mockDb.developerFlag.findUnique.mock.calls[0]?.[0];
    expect(call.where.trackingTokenHash).not.toBe(VALID_TRACKING_TOKEN);
    expect(typeof call.where.trackingTokenHash).toBe('string');
  });
});
