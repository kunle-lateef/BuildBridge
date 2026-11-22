import { describe, expect, it } from 'vitest';

import {
  getLoopState,
  INITIAL_MS,
  LOOP_MS,
  R2_NEW_VALUE,
  SCORE_AFTER,
  SCORE_BEFORE,
  snapToEvent,
  STILL_MS,
} from './heroLoopTimeline';

const everyFrame = () => Array.from({ length: Math.ceil(LOOP_MS / 25) }, (_, i) => snapToEvent(i * 25));

describe('getLoopState', () => {
  it('opens on findings already on screen, never on an empty analysis', () => {
    const state = getLoopState(INITIAL_MS);
    expect(state.isAnalyzing).toBe(false);
    expect(Object.values(state.rowsShown).every(Boolean)).toBe(true);
    expect(state.isGapShown).toBe(true);
    expect(state.score).toBe(SCORE_BEFORE);
    expect(state.r1.isConfirmed).toBe(false);
  });

  it('rests on a ready, shared frame for reduced motion', () => {
    const state = getLoopState(STILL_MS);
    expect(state.status).toBe('Ready');
    expect(state.score).toBe(SCORE_AFTER);
    expect(state.gap.isAnswered).toBe(true);
    expect(state.isDialogOpen).toBe(true);
    expect(state.isToastShown).toBe(true);
  });

  it('follows readiness formula v1: confirming and correcting values never move the score', () => {
    const atConfirm = getLoopState(snapToEvent(4_600));
    expect(atConfirm.r1.isConfirmed).toBe(true);
    expect(atConfirm.score).toBe(SCORE_BEFORE);

    const atModify = getLoopState(snapToEvent(7_100));
    expect(atModify.r2.isSaved).toBe(true);
    expect(atModify.score).toBe(SCORE_BEFORE);
  });

  it('only reaches Ready once the critical gap is answered', () => {
    for (const ms of everyFrame()) {
      const state = getLoopState(ms);
      if (state.isReady || state.status === 'Ready') expect(state.gap.isAnswered).toBe(true);
      if (!state.gap.isAnswered && state.isScoreShown) expect(state.score).toBe(SCORE_BEFORE);
    }
  });

  it('only offers sharing on a ready handoff', () => {
    for (const ms of everyFrame()) {
      const state = getLoopState(ms);
      if (state.isDialogOpen || state.isToastShown) expect(state.isReady).toBe(true);
    }
  });

  it('types the corrected value before it is saved', () => {
    expect(getLoopState(snapToEvent(6_000)).r2.isInputSelected).toBe(true);
    expect(getLoopState(snapToEvent(6_600)).r2.input).toBe(R2_NEW_VALUE);
  });

  it('starts each cycle analyzing, with nothing BuildBridge added yet', () => {
    const state = getLoopState(0);
    expect(state.status).toBe('Analyzing');
    expect(state.isAnalyzing).toBe(true);
    expect(Object.values(state.rowsShown).some(Boolean)).toBe(false);
    expect(state.isScoreShown).toBe(false);
    expect(state.cursor.isVisible).toBe(false);
  });

  it('fades everything it added before the loop restarts', () => {
    const state = getLoopState(snapToEvent(13_600));
    expect(state.isFadingOut).toBe(true);
    expect(state.isGapShown).toBe(false);
    expect(state.isDialogOpen).toBe(false);
    expect(state.isToastShown).toBe(false);
  });
});

describe('snapToEvent', () => {
  it('never moves time forward', () => {
    for (let ms = 0; ms < LOOP_MS; ms += 37) {
      expect(snapToEvent(ms)).toBeLessThanOrEqual(ms);
    }
  });
});
