import { describe, expect, it } from 'vitest';

import { projectCycleUsage } from './plan-limits';

describe('projectCycleUsage', () => {
  it('projects linearly from the current pace — halfway through the cycle, doubles current usage', () => {
    const cycleStart = new Date('2026-08-01T00:00:00Z');
    const cycleEnd = new Date('2026-09-01T00:00:00Z');
    const now = new Date('2026-08-16T00:00:00Z'); // roughly halfway through a 31-day cycle

    expect(projectCycleUsage(5, cycleStart, cycleEnd, now)).toBeCloseTo(10, -1);
  });

  it('returns actual usage unprojected in the first ~3% of the cycle, rather than a noisy inflated estimate', () => {
    const cycleStart = new Date('2026-08-01T00:00:00Z');
    const cycleEnd = new Date('2026-09-01T00:00:00Z');
    const now = new Date('2026-08-01T06:00:00Z'); // a few hours in

    expect(projectCycleUsage(1, cycleStart, cycleEnd, now)).toBe(1);
  });

  it('returns actual usage at the very end of the cycle (fraction elapsed ~1)', () => {
    const cycleStart = new Date('2026-08-01T00:00:00Z');
    const cycleEnd = new Date('2026-09-01T00:00:00Z');
    const now = new Date('2026-08-31T23:00:00Z');

    expect(projectCycleUsage(20, cycleStart, cycleEnd, now)).toBeCloseTo(20, -1);
  });

  it('clamps a `now` past cycleEnd to fraction 1.0 rather than projecting below actual usage', () => {
    const cycleStart = new Date('2026-08-01T00:00:00Z');
    const cycleEnd = new Date('2026-09-01T00:00:00Z');
    const now = new Date('2026-09-15T00:00:00Z'); // stale billingCycleStart, past the cycle end

    expect(projectCycleUsage(20, cycleStart, cycleEnd, now)).toBe(20);
  });

  it('falls back to actual usage when cycleEnd is not after cycleStart (malformed input)', () => {
    const cycleStart = new Date('2026-08-01T00:00:00Z');

    expect(projectCycleUsage(7, cycleStart, cycleStart)).toBe(7);
  });
});
