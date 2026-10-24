import { describe, expect, it } from 'vitest';

import {
  getLoopState,
  INITIAL_MS,
  LOOP_FINDINGS,
  LOOP_MS,
  snapToEvent,
  STILL_MS,
} from './heroLoopTimeline';

describe('getLoopState', () => {
  it('opens on all findings shown and none confirmed, not on an empty upload', () => {
    const state = getLoopState(INITIAL_MS);
    expect(state.detectedCount).toBe(LOOP_FINDINGS.length);
    expect(state.confirmedCount).toBe(0);
    expect(state.isUploadVisible).toBe(false);
    expect(state.isEmptyVisible).toBe(false);
    expect(state.cursor.isVisible).toBe(false);
  });

  it('rests on a fully confirmed, shareable frame for reduced motion', () => {
    const state = getLoopState(STILL_MS);
    expect(state.confirmedCount).toBe(LOOP_FINDINGS.length);
    expect(state.status).toBe('Ready');
    expect(state.scoreTarget).toBe(100);
    expect(state.isShareVisible).toBe(true);
    expect(state.cursor.isVisible).toBe(false);
  });

  it('only offers the share link once every finding is confirmed or resolved', () => {
    for (let ms = 0; ms < LOOP_MS; ms += 50) {
      const state = getLoopState(snapToEvent(ms));
      if (state.isShareVisible) expect(state.confirmedCount).toBe(LOOP_FINDINGS.length);
    }
  });

  it('starts each cycle from a clean slate', () => {
    const state = getLoopState(0);
    expect(state.status).toBe('Draft');
    expect(state.detectedCount).toBe(0);
    expect(state.scoreTarget).toBe(0);
    expect(state.isUploadVisible).toBe(true);
  });
});

describe('snapToEvent', () => {
  it('never moves time forward', () => {
    for (let ms = 0; ms < LOOP_MS; ms += 37) {
      expect(snapToEvent(ms)).toBeLessThanOrEqual(ms);
    }
  });
});
