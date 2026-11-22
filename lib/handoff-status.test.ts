import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));

const { statusAfterUnarchive } = await import('./handoff-status');

const analysed = {
  latestRunStatus: 'Completed' as const,
  latestSuccessfulRunStatus: 'Completed' as const,
  hasActiveShareLink: false,
  hasUnresolvedCritical: false,
};

describe('statusAfterUnarchive', () => {
  it('goes back to Draft when nothing was ever analysed', () => {
    expect(statusAfterUnarchive({ ...analysed, latestRunStatus: null, latestSuccessfulRunStatus: null })).toBe('Draft');
  });

  it('goes back to Draft when every run failed', () => {
    expect(statusAfterUnarchive({ ...analysed, latestRunStatus: 'Failed', latestSuccessfulRunStatus: null })).toBe('Draft');
  });

  it('shows Analyzing while a run is still queued or processing', () => {
    expect(statusAfterUnarchive({ ...analysed, latestRunStatus: 'Processing' })).toBe('Analyzing');
    expect(statusAfterUnarchive({ ...analysed, latestRunStatus: 'Queued', latestSuccessfulRunStatus: null })).toBe('Analyzing');
  });

  it('is Ready when analysed with no open critical gap', () => {
    expect(statusAfterUnarchive(analysed)).toBe('Ready');
  });

  it('needs review when a critical gap is open', () => {
    expect(statusAfterUnarchive({ ...analysed, hasUnresolvedCritical: true })).toBe('NeedsReview');
  });

  it('needs review when the latest successful run only partly finished', () => {
    expect(statusAfterUnarchive({ ...analysed, latestSuccessfulRunStatus: 'PartiallyCompleted' })).toBe('NeedsReview');
  });

  it('keeps an earlier success when the newest run failed, as the pipeline does', () => {
    expect(statusAfterUnarchive({ ...analysed, latestRunStatus: 'Failed' })).toBe('Ready');
  });

  it('is Shared while a share link is still live', () => {
    expect(statusAfterUnarchive({ ...analysed, hasActiveShareLink: true, hasUnresolvedCritical: true })).toBe('Shared');
  });
});
