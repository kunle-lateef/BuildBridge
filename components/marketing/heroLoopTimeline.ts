import type { HandoffStatus, IssueSeverity, ProvenanceType } from '@/lib/types';

export const LOOP_MS = 14000;

/**
 * Where the loop starts on first paint (and in the server render): all four
 * findings already on screen, none confirmed yet. Opening on the upload
 * step instead meant a visitor glancing at the hero — or a link preview —
 * saw an empty screen and a 0% score, the least telling moment of the loop.
 * Later cycles still play upload and analysis from the top.
 */
const FIRST_FRAME_MS = 3300;

/** The resting frame shown under prefers-reduced-motion: everything confirmed, link ready. */
const STILL_FRAME_MS = 9500;

const SCREEN_REVEAL_MS = 100;
const UPLOAD_DONE_MS = 1000;
const SCAN_START_MS = 1100;
const EMPTY_HIDE_MS = 1600;
const SCAN_END_MS = 2700;
const CURSOR_IN_MS = 3350;
const REVIEW_START_MS = 3400;
const SHARE_IN_MS = 8500;
const CURSOR_OUT_MS = 8600;
const FADE_OUT_MS = 12800;
const UPLOAD_RESET_MS = 13000;
const EMPTY_SHOW_MS = 13400;
const UPLOAD_SHOW_MS = 13600;

const PRESS_MS = 100;
const CURSOR_LEAVE_MS = 160;
const RIPPLE_MS = 450;

export type LoopFindingId = 'focus' | 'button' | 'loading' | 'tablet';

export type LoopFinding = {
  id: LoopFindingId;
  name: string;
  value: string;
  // A HandoffIssue carries a severity, not a provenance — the tablet gap is
  // labelled the way the real issue panel labels it, not as a fourth
  // provenance type.
  label: { provenance: ProvenanceType } | { severity: IssueSeverity };
  action: 'Confirm' | 'Resolve';
  doneStatus: 'Confirmed' | 'Resolved';
  detectedAt: number;
  clickAt: number;
};

export const LOOP_FINDINGS: LoopFinding[] = [
  {
    id: 'focus',
    name: 'Card input focus state',
    value: '2px indigo ring',
    label: { provenance: 'Inferred' },
    action: 'Confirm',
    doneStatus: 'Confirmed',
    detectedAt: 1500,
    clickAt: 4600,
  },
  {
    id: 'button',
    name: 'Primary button',
    value: 'Radius 8px · #4F46E5',
    label: { provenance: 'Detected' },
    action: 'Confirm',
    doneStatus: 'Confirmed',
    detectedAt: 2100,
    clickAt: 5600,
  },
  {
    id: 'loading',
    name: 'Loading state',
    value: 'Spinner, centered',
    label: { provenance: 'Suggested' },
    action: 'Confirm',
    doneStatus: 'Confirmed',
    detectedAt: 2450,
    clickAt: 6600,
  },
  {
    id: 'tablet',
    name: 'Tablet breakpoint',
    value: 'Not shown in design',
    label: { severity: 'Critical' },
    action: 'Resolve',
    doneStatus: 'Resolved',
    detectedAt: 2900,
    clickAt: 7800,
  },
];

export type CursorTarget = 'start' | LoopFindingId | 'exit';

export type LoopFindingState = {
  isShown: boolean;
  isPressed: boolean;
  isDone: boolean;
  isRippling: boolean;
};

export type LoopState = {
  isScreenDim: boolean;
  isUploadVisible: boolean;
  isUploadFilled: boolean;
  scanPhase: 'idle' | 'sweeping' | 'done';
  isFadingOut: boolean;
  isEmptyVisible: boolean;
  findings: Record<LoopFindingId, LoopFindingState>;
  detectedCount: number;
  confirmedCount: number;
  status: HandoffStatus;
  scoreTarget: number;
  isShareVisible: boolean;
  cursor: { target: CursorTarget; isVisible: boolean; isPressed: boolean };
};

/**
 * Every moment the loop's visible state can change. The clock only re-renders
 * when it crosses one of these; CSS transitions do the in-between motion.
 */
const EVENT_TIMES = [
  ...new Set([
    0,
    SCREEN_REVEAL_MS,
    UPLOAD_DONE_MS,
    SCAN_START_MS,
    EMPTY_HIDE_MS,
    SCAN_END_MS,
    CURSOR_IN_MS,
    REVIEW_START_MS,
    SHARE_IN_MS,
    CURSOR_OUT_MS,
    FADE_OUT_MS,
    UPLOAD_RESET_MS,
    EMPTY_SHOW_MS,
    UPLOAD_SHOW_MS,
    ...LOOP_FINDINGS.flatMap((f) => [
      f.detectedAt,
      f.clickAt - PRESS_MS,
      f.clickAt,
      f.clickAt + PRESS_MS,
      f.clickAt + CURSOR_LEAVE_MS,
      f.clickAt + RIPPLE_MS,
    ]),
  ]),
].sort((a, b) => a - b);

/** Snaps an elapsed time to the latest event at or before it, so unchanged frames bail out of re-rendering. */
export function snapToEvent(ms: number): number {
  let snapped = 0;
  for (const time of EVENT_TIMES) {
    if (time > ms) break;
    snapped = time;
  }
  return snapped;
}

export const INITIAL_MS = snapToEvent(FIRST_FRAME_MS);
export const STILL_MS = snapToEvent(STILL_FRAME_MS);

export function getLoopState(ms: number): LoopState {
  const isFadingOut = ms >= FADE_OUT_MS;

  const findingList = LOOP_FINDINGS.map((f) => ({
    id: f.id,
    isShown: ms >= f.detectedAt && !isFadingOut,
    isPressed: ms >= f.clickAt - PRESS_MS && ms < f.clickAt + PRESS_MS,
    isDone: ms >= f.clickAt + PRESS_MS && !isFadingOut,
    isRippling: ms >= f.clickAt && ms < f.clickAt + RIPPLE_MS,
  }));
  const findings = Object.fromEntries(findingList.map(({ id, ...rest }) => [id, rest])) as Record<
    LoopFindingId,
    LoopFindingState
  >;
  const detectedCount = findingList.filter((f) => f.isShown).length;
  const confirmedCount = findingList.filter((f) => f.isDone).length;

  let status: HandoffStatus = 'Draft';
  if (ms >= SCAN_START_MS && !isFadingOut) {
    if (ms < REVIEW_START_MS) status = 'Analyzing';
    else status = confirmedCount < LOOP_FINDINGS.length ? 'NeedsReview' : 'Ready';
  }

  const nextClick = LOOP_FINDINGS.find((f) => ms < f.clickAt + CURSOR_LEAVE_MS);
  let cursorTarget: CursorTarget = 'start';
  if (ms >= CURSOR_IN_MS) cursorTarget = nextClick ? nextClick.id : 'exit';

  return {
    isScreenDim: ms < SCREEN_REVEAL_MS || isFadingOut,
    isUploadVisible: ms < UPLOAD_DONE_MS || ms >= UPLOAD_SHOW_MS,
    isUploadFilled: ms < UPLOAD_RESET_MS,
    scanPhase: ms < SCAN_START_MS ? 'idle' : ms < SCAN_END_MS ? 'sweeping' : 'done',
    isFadingOut,
    isEmptyVisible: ms < EMPTY_HIDE_MS || ms >= EMPTY_SHOW_MS,
    findings,
    detectedCount,
    confirmedCount,
    status,
    // Illustrative only — an even share per finding, not the real
    // readiness formula (lib/readiness.ts), which this marketing loop doesn't run.
    scoreTarget: isFadingOut ? 0 : Math.round((confirmedCount / LOOP_FINDINGS.length) * 100),
    isShareVisible: ms >= SHARE_IN_MS && !isFadingOut,
    cursor: {
      target: cursorTarget,
      isVisible: ms >= CURSOR_IN_MS && ms < CURSOR_OUT_MS,
      isPressed: findingList.some((f) => f.isPressed),
    },
  };
}
