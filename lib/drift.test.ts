import { describe, expect, it, vi } from 'vitest';

const mockDb = {
  specification: { findMany: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { getPortfolioDrift } = await import('./drift');

function spec(overrides: Record<string, unknown> = {}) {
  return {
    category: 'Radius',
    property: 'corner-radius',
    value: '8',
    unit: 'px',
    component: {
      name: 'Primary Button',
      handoff: { id: 'handoff-1', name: 'Checkout redesign' },
    },
    ...overrides,
  };
}

describe('getPortfolioDrift', () => {
  it('excludes Rejected specs and scopes to the owner\'s non-Archived handoffs', async () => {
    mockDb.specification.findMany.mockResolvedValue([]);

    await getPortfolioDrift('user-a');

    expect(mockDb.specification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          component: { handoff: { ownerId: 'user-a', status: { not: 'Archived' } } },
          reviewStatus: { not: 'Rejected' },
        },
      }),
    );
  });

  it('flags an outlier across two different handoffs and attributes it to the correct one', async () => {
    mockDb.specification.findMany.mockResolvedValue([
      spec({ component: { name: 'Button A', handoff: { id: 'handoff-1', name: 'Checkout redesign' } } }),
      spec({ component: { name: 'Button B', handoff: { id: 'handoff-2', name: 'Onboarding flow' } } }),
      spec({
        value: '16',
        component: { name: 'Button C', handoff: { id: 'handoff-3', name: 'Settings page' } },
      }),
    ]);

    const result = await getPortfolioDrift('user-a');

    expect(result).toHaveLength(1);
    expect(result[0]?.handoffId).toBe('handoff-3');
    expect(result[0]?.handoffName).toBe('Settings page');
    expect(result[0]?.title).toContain('Button C');
  });

  it('never returns a NewIssueFinding-persistable shape confused with a real HandoffIssue — every result carries handoff attribution', async () => {
    mockDb.specification.findMany.mockResolvedValue([
      spec({ component: { name: 'Button A', handoff: { id: 'handoff-1', name: 'A' } } }),
      spec({ component: { name: 'Button B', handoff: { id: 'handoff-1', name: 'A' } } }),
      spec({ value: '999', component: { name: 'Button C', handoff: { id: 'handoff-1', name: 'A' } } }),
    ]);

    const result = await getPortfolioDrift('user-a');

    for (const finding of result) {
      expect(finding.handoffId).toBeTruthy();
      expect(finding.handoffName).toBeTruthy();
    }
  });

  it('skips a specification whose component has no handoff relation loaded (defensive, should not throw)', async () => {
    mockDb.specification.findMany.mockResolvedValue([spec({ component: null })]);

    await expect(getPortfolioDrift('user-a')).resolves.toEqual([]);
  });
});
