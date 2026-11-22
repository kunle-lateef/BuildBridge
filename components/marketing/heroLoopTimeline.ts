import type { HandoffStatus } from '@/lib/types';

/**
 * The hero's 14-second loop, as a pure function of time. Matches the
 * approved storyboard (code-phase-plan.md §9, playable v8 reference): every
 * state on screen is a real Review page state, and only one thing moves at a
 * time.
 *
 *   1. 0.0–1.6s   Analyze the screen: the five analysis stages tick through
 *                 while one line sweeps the checkout screen.
 *   2. 1.6–3.4s   Findings land: pins and rows arrive one by one, the
 *                 critical gap last. Readiness shows 78%.
 *   3. 3.4–5.0s   Confirm a Detected value. The score stays at 78%.
 *   4. 5.0–7.6s   Correct an Inferred value with the Modify editor. Still 78%.
 *   5. 7.6–10.0s  Answer the critical gap.
 *   6. 10.0–14.0s Readiness counts 78% → 85% and turns ready; share dialog,
 *                 Copy link, "Link copied". Then BuildBridge's layer fades.
 *
 * The score follows readiness formula v1 (lib/readiness.ts) for this demo
 * handoff: confirming or correcting values never moves it, and answering the
 * one open critical gap is what makes it Ready. 78 and 85 are the formula's
 * own numbers for the "Ledger · Checkout v3" example.
 */

export const LOOP_MS = 14_000;

/** First paint and link previews land on beat 2, so a glance always shows findings. */
const FIRST_FRAME_MS = 3_000;
/** Reduced motion: beat 6, ready with the share dialog open and the link copied. */
const STILL_FRAME_MS = 12_900;

export const SCORE_BEFORE = 78;
export const SCORE_AFTER = 85;

const FINDINGS_AT = 1_600;
const ANALYSIS_STAGE_MS = 250;
export const ANALYSIS_STAGES = [
  'Component detection',
  'Specification extraction',
  'State & interaction analysis',
  'Responsive analysis',
  'Gap detection',
] as const;

const SCAN_START = 150;
const SCAN_END = 1_450;

export type LoopRowId = 'r1' | 'r2' | 'r3' | 'r4';
const ROW_IN: Record<LoopRowId, number> = { r1: 1_600, r2: 1_750, r3: 1_900, r4: 2_050 };
const GAP_IN = 2_300;
const GAP_PULSE = [2_540, 3_140] as const;
const SCORE_IN = 2_600;

const R1_CONFIRM = 4_500;
const R2_SELECT = 5_800;
const R2_OPEN = 5_900;
const R2_TYPE = [6_050, 6_500] as const;
const R2_SAVE = 7_050;
const GAP_SELECT = 8_400;
const GAP_OPEN = 8_500;
const GAP_TYPE = [8_800, 9_400] as const;
const GAP_SAVE = 9_900;
const LIST_SCROLL_END = 10_300;
const SCORE_COUNT = [10_000, 10_900] as const;
const DIALOG_IN = 11_700;
const TOAST_IN = 12_400;
const CURSOR_IN = 3_400;
const CURSOR_OUT = 12_700;
const FADE_OUT = 13_500;

export const R2_OLD_VALUE = '2px primary, offset 2';
export const R2_NEW_VALUE = '3px primary, offset 2';
export const GAP_ANSWER =
  'Show “Your card was declined. Try another card.” above Pay. Keep the form filled in and focus the card number.';

export type CursorTarget = 'start' | 'c1' | 'r2title' | 'r2save' | 'gapQ' | 'gapSave' | 'share' | 'copyLink';

/** [start, end, target]: the cursor travels to `target` over start→end. */
const CURSOR_MOVES: [number, number, CursorTarget][] = [
  [3_500, 4_300, 'c1'],
  [5_000, 5_700, 'r2title'],
  [6_550, 6_900, 'r2save'],
  [7_600, 8_300, 'gapQ'],
  [9_450, 9_750, 'gapSave'],
  [10_950, 11_550, 'share'],
  [11_800, 12_250, 'copyLink'],
];

export type PressTarget = 'c1' | 'r2save' | 'gapSave' | 'share' | 'copyLink';
type TapTarget = LoopRowId | 'gap';
/** [start, end, button pressed (desktop), row tapped (phones)]. */
const PRESSES: [number, number, PressTarget | null, TapTarget | null][] = [
  [4_400, 4_500, 'c1', 'r1'],
  [5_800, 5_900, null, 'r2'],
  [6_950, 7_050, 'r2save', 'r2'],
  [8_400, 8_500, null, 'gap'],
  [9_800, 9_900, 'gapSave', 'gap'],
  [11_600, 11_700, 'share', null],
  [12_300, 12_400, 'copyLink', null],
];

export type AnalysisStageState = 'todo' | 'now' | 'done';

export type LoopState = {
  status: HandoffStatus;
  isAnalyzing: boolean;
  stages: AnalysisStageState[];
  scanPhase: 'idle' | 'sweeping' | 'done';
  isFadingOut: boolean;
  rowsShown: Record<LoopRowId, boolean>;
  isGapShown: boolean;
  isGapPulsing: boolean;
  r1: { isSelected: boolean; isOpen: boolean; isConfirmed: boolean };
  r2: { isSelected: boolean; isOpen: boolean; isSaved: boolean; input: string; isInputSelected: boolean };
  gap: { isSelected: boolean; isOpen: boolean; isAnswered: boolean; typed: string };
  isListScrolled: boolean;
  /** Which part of the checkout screen the selected finding outlines. */
  screenSelection: 'payButton' | 'cardField' | null;
  isScoreShown: boolean;
  score: number;
  isReady: boolean;
  isDialogOpen: boolean;
  isToastShown: boolean;
  pressed: PressTarget | null;
  tapped: TapTarget | null;
  cursor: { target: CursorTarget; moveMs: number; isVisible: boolean; isPressed: boolean };
};

const within = (ms: number, start: number, end: number) => ms >= start && ms < end;
const progress = (ms: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (ms - start) / (end - start)));
const typed = (text: string, ms: number, [start, end]: readonly [number, number]) =>
  text.slice(0, Math.round(text.length * progress(ms, start, end)));
// ≈ cubic-bezier(0.65, 0, 0.35, 1), the loop's one easing curve.
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function getLoopState(ms: number): LoopState {
  const isFadingOut = ms >= FADE_OUT;
  const hasFindings = ms >= FINDINGS_AT;
  const visible = (start: number) => ms >= start && !isFadingOut;

  let status: HandoffStatus = 'Analyzing';
  if (hasFindings) status = ms >= SCORE_COUNT[1] ? 'Ready' : 'NeedsReview';

  const stages = ANALYSIS_STAGES.map((_, i): AnalysisStageState => {
    if (ms >= ANALYSIS_STAGE_MS * (i + 1)) return 'done';
    if (ms >= ANALYSIS_STAGE_MS * i) return 'now';
    return 'todo';
  });

  const gapSelected = within(ms, GAP_SELECT, GAP_SAVE);
  const r2Saved = ms >= R2_SAVE;

  const move = [...CURSOR_MOVES].reverse().find(([start]) => ms >= start);
  const press = PRESSES.find(([start, end]) => within(ms, start, end));

  let screenSelection: LoopState['screenSelection'] = null;
  if (hasFindings && !isFadingOut) {
    if (ms < R1_CONFIRM || gapSelected) screenSelection = 'payButton';
    else if (within(ms, R2_SELECT, R2_SAVE)) screenSelection = 'cardField';
  }

  return {
    status,
    isAnalyzing: !hasFindings,
    stages,
    scanPhase: ms < SCAN_START ? 'idle' : ms < SCAN_END ? 'sweeping' : 'done',
    isFadingOut,
    rowsShown: {
      r1: visible(ROW_IN.r1),
      r2: visible(ROW_IN.r2),
      r3: visible(ROW_IN.r3),
      r4: visible(ROW_IN.r4),
    },
    isGapShown: visible(GAP_IN),
    isGapPulsing: within(ms, GAP_PULSE[0], GAP_PULSE[1]),
    r1: {
      isSelected: hasFindings && ms < R1_CONFIRM,
      isOpen: ms < R1_CONFIRM,
      isConfirmed: ms >= R1_CONFIRM,
    },
    r2: {
      isSelected: within(ms, R2_SELECT, R2_SAVE),
      isOpen: within(ms, R2_OPEN, R2_SAVE),
      isSaved: r2Saved,
      input: ms < R2_TYPE[0] ? R2_OLD_VALUE : typed(R2_NEW_VALUE, ms, R2_TYPE),
      isInputSelected: ms < R2_TYPE[0],
    },
    gap: {
      isSelected: gapSelected,
      isOpen: within(ms, GAP_OPEN, GAP_SAVE),
      isAnswered: ms >= GAP_SAVE,
      typed: typed(GAP_ANSWER, ms, GAP_TYPE),
    },
    isListScrolled: within(ms, GAP_SELECT, LIST_SCROLL_END),
    screenSelection,
    isScoreShown: visible(SCORE_IN),
    score: Math.round(SCORE_BEFORE + (SCORE_AFTER - SCORE_BEFORE) * easeInOut(progress(ms, ...SCORE_COUNT))),
    isReady: ms >= SCORE_COUNT[1],
    isDialogOpen: visible(DIALOG_IN),
    isToastShown: visible(TOAST_IN),
    pressed: press?.[2] ?? null,
    tapped: press?.[3] ?? null,
    cursor: {
      target: move?.[2] ?? 'start',
      moveMs: move ? move[1] - move[0] : 0,
      isVisible: within(ms, CURSOR_IN, CURSOR_OUT),
      isPressed: press?.[2] != null,
    },
  };
}

/**
 * Every moment the loop's visible state can change, so the clock only
 * re-renders when one is crossed; CSS transitions carry the motion between.
 * Typing and the score count-up change every character / percent, so each
 * step gets its own event.
 */
const EVENT_TIMES: number[] = (() => {
  const times = new Set<number>([
    0,
    SCAN_START,
    SCAN_END,
    FINDINGS_AT,
    ...ANALYSIS_STAGES.map((_, i) => ANALYSIS_STAGE_MS * (i + 1)),
    ...Object.values(ROW_IN),
    GAP_IN,
    ...GAP_PULSE,
    SCORE_IN,
    R1_CONFIRM,
    R2_SELECT,
    R2_OPEN,
    R2_SAVE,
    GAP_SELECT,
    GAP_OPEN,
    GAP_SAVE,
    LIST_SCROLL_END,
    ...SCORE_COUNT,
    DIALOG_IN,
    TOAST_IN,
    CURSOR_IN,
    CURSOR_OUT,
    FADE_OUT,
    ...CURSOR_MOVES.map(([start]) => start),
    ...PRESSES.flatMap(([start, end]) => [start, end]),
  ]);
  const addSteps = ([start, end]: readonly [number, number], steps: number) => {
    for (let i = 0; i <= steps; i += 1) times.add(Math.round(start + ((end - start) * i) / steps));
  };
  addSteps(R2_TYPE, R2_NEW_VALUE.length);
  addSteps(GAP_TYPE, Math.ceil(GAP_ANSWER.length / 2));
  addSteps(SCORE_COUNT, 36);
  return [...times].sort((a, b) => a - b);
})();

/** Snaps an elapsed time to the latest event at or before it, so unchanged frames skip re-rendering. */
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
