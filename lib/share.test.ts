import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  shareLink: { findUnique: vi.fn() },
  handoff: { findUniqueOrThrow: vi.fn() },
  screen: { findMany: vi.fn() },
  component: { findMany: vi.fn() },
  responsiveRule: { findMany: vi.fn() },
  handoffIssue: { findMany: vi.fn() },
  designerNote: { findMany: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/storage', () => ({
  createSignedReadUrl: vi.fn().mockResolvedValue('https://example.r2.cloudflarestorage.com/signed'),
}));

const { buildDeveloperProjection, generateShareToken, hashToken, resolveShareLink } = await import('./share');

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('generateShareToken / hashToken', () => {
  it('produces a token whose hash is deterministic and matches the returned hash', () => {
    const { rawToken, tokenHash } = generateShareToken();

    expect(hashToken(rawToken)).toBe(tokenHash);
  });

  it('never returns the same raw token twice', () => {
    const a = generateShareToken();
    const b = generateShareToken();

    expect(a.rawToken).not.toBe(b.rawToken);
  });
});

describe('resolveShareLink — fails closed', () => {
  beforeEach(() => {
    mockDb.shareLink.findUnique.mockReset();
  });

  it('returns null for a token that does not exist', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue(null);

    expect(await resolveShareLink('nonexistent-token')).toBeNull();
  });

  it('returns null for a Revoked link even if not expired', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue({
      id: 'link-1',
      status: 'Revoked',
      expiresAt: daysFromNow(30),
    });

    expect(await resolveShareLink('revoked-token')).toBeNull();
  });

  it('returns null for an Active link past its expiresAt', async () => {
    mockDb.shareLink.findUnique.mockResolvedValue({
      id: 'link-2',
      status: 'Active',
      expiresAt: daysFromNow(-1),
    });

    expect(await resolveShareLink('expired-token')).toBeNull();
  });

  it('returns the link for an Active, unexpired token', async () => {
    const link = { id: 'link-3', status: 'Active', expiresAt: daysFromNow(1) };
    mockDb.shareLink.findUnique.mockResolvedValue(link);

    expect(await resolveShareLink('valid-token')).toEqual(link);
  });

  it('returns the link for an Active token with no expiry set', async () => {
    const link = { id: 'link-4', status: 'Active', expiresAt: null };
    mockDb.shareLink.findUnique.mockResolvedValue(link);

    expect(await resolveShareLink('valid-token-no-expiry')).toEqual(link);
  });
});

describe('buildDeveloperProjection — never leaks designer-only data', () => {
  it('excludes ownerId and every other designer-only field anywhere in the projection', async () => {
    // Deliberately includes ownerId and other sensitive fields in the mocked
    // "database" rows a real Prisma query could return, to prove the
    // projection function itself strips them — not just that we forgot to
    // put them in the mock.
    mockDb.handoff.findUniqueOrThrow.mockResolvedValue({
      name: 'Checkout redesign',
      description: 'Q3 checkout flow',
      readinessScore: 87,
      readinessAlgorithmVersion: 1,
      ownerId: 'user-secret-owner-id',
    });
    mockDb.screen.findMany.mockResolvedValue([
      {
        id: 'screen-1',
        name: 'Checkout',
        analysisStatus: 'Analyzed',
        handoffId: 'handoff-1',
        asset: { storageReference: 'handoffs/handoff-1/asset.png', processingStatus: 'Processed' },
      },
    ]);
    mockDb.component.findMany.mockResolvedValue([
      {
        id: 'component-1',
        handoffId: 'handoff-1',
        name: 'Pay button',
        type: 'Button',
        description: 'Primary CTA',
        provenance: 'Detected',
        reviewStatus: 'Confirmed',
        specifications: [
          {
            id: 'spec-1',
            componentId: 'component-1',
            category: 'Dimensions',
            property: 'height',
            value: '48',
            unit: 'px',
            provenance: 'Detected',
            reviewStatus: 'Unreviewed',
          },
        ],
        states: [
          {
            id: 'state-1',
            componentId: 'component-1',
            name: 'Default',
            description: 'Solid fill',
            provenance: 'Detected',
            reviewStatus: 'Unreviewed',
          },
        ],
      },
    ]);
    mockDb.responsiveRule.findMany.mockResolvedValue([]);
    mockDb.handoffIssue.findMany.mockResolvedValue([
      {
        id: 'issue-1',
        handoffId: 'handoff-1',
        title: 'Disabled state undefined',
        description: 'Not confirmed',
        severity: 'Medium',
        category: 'InteractionStates',
        recommendation: null,
        status: 'Open',
        provenance: 'Suggested',
      },
    ]);
    mockDb.designerNote.findMany.mockResolvedValue([
      { id: 'note-1', handoffId: 'handoff-1', content: 'Use existing button component', createdBy: 'user-secret-owner-id' },
    ]);

    const projection = await buildDeveloperProjection('handoff-1');

    const serialized = JSON.stringify(projection);

    expect(serialized).not.toContain('ownerId');
    expect(serialized).not.toContain('user-secret-owner-id');
    expect(serialized).not.toContain('createdBy');
    expect(serialized).not.toContain('handoffId');
  });
});
