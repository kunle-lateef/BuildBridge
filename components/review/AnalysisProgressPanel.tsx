'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { CheckCircle2, Circle, Clock, Minus, XCircle } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { AnalysisRunStatus } from '@/lib/types';

export type StageProgress = {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'incomplete';
  /** Short count once a stage is done: "14 components". */
  countLabel: string;
  provenanceSplit?: { detected: number; inferred: number; suggested: number };
};

type AnalysisProgressPanelProps = {
  runStatus: AnalysisRunStatus;
  stages: StageProgress[];
  className?: string;
};

const POLL_INTERVAL_MS = 4000;

const NOTE: Partial<Record<AnalysisRunStatus, string>> = {
  Queued: 'Findings appear here as each stage finishes. You can leave this page; you’ll get a notification when it’s done.',
  Processing:
    'Findings appear here as each stage finishes. You can leave this page; you’ll get a notification when it’s done.',
  PartiallyCompleted: 'Everything found so far is ready to review.',
  Failed:
    'This usually clears up on a second try. If it fails again, check the screens are clean exports, not photos or very long scrolls.',
};

/**
 * The Analysis panel (Figma `04 — Handoff` → "Review — Analyzing",
 * "— Partly analyzed", "— Analysis failed"): the five stages, each with its
 * state and what it found. Polls with router.refresh() while the run is
 * active, since there's no push channel; every row is computed server-side
 * from persisted findings, so a refresh is always the real progress.
 * A stage that didn't finish never reads as done.
 */
export function AnalysisProgressPanel({ runStatus, stages, className }: AnalysisProgressPanelProps) {
  const router = useRouter();
  const isActive = runStatus === 'Queued' || runStatus === 'Processing';
  const firstIncomplete = stages.findIndex((stage) => stage.status === 'incomplete');

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive, router]);

  return (
    <aside className={cn('flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[--color-border] bg-white', className)}>
      <h2 className="m-0 border-b border-[--color-border] px-4 py-3 text-[14px] font-medium leading-5 text-[--color-text-primary]">
        Analysis
      </h2>
      <ul className="m-0 list-none py-2 pl-0">
        {stages.map((stage, index) => {
          // A failed run stops at its first stage; the ones after it never ran.
          const didNotRun = runStatus === 'Failed' && stage.status === 'incomplete' && index > firstIncomplete;
          return (
            <li
              key={stage.key}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-[14px] leading-5',
                stage.status === 'running' ? 'bg-[--color-background] text-[--color-text-primary]' : 'text-[--color-text-secondary]',
                stage.status === 'done' && 'text-[--color-text-body]',
              )}
            >
              <StageIcon status={stage.status} runFailed={runStatus === 'Failed'} didNotRun={didNotRun} />
              <span className="flex-1">{stage.label}</span>
              <span
                className={cn(
                  'text-[12px] leading-4',
                  stage.status === 'incomplete' && runStatus === 'Failed' && !didNotRun ? 'text-[--color-error]' : 'text-[--color-text-secondary]',
                )}
              >
                {stage.status === 'done' && stage.countLabel}
                {stage.status === 'running' && 'In progress'}
                {stage.status === 'incomplete' && (runStatus === 'Failed' ? (didNotRun ? 'Didn’t run' : 'Failed') : 'Didn’t finish · check by hand')}
              </span>
            </li>
          );
        })}
      </ul>
      {NOTE[runStatus] && <p className="m-0 px-4 pb-4 pt-1 text-[14px] leading-5 text-[--color-text-secondary]">{NOTE[runStatus]}</p>}
    </aside>
  );
}

function StageIcon({ status, runFailed, didNotRun }: { status: StageProgress['status']; runFailed: boolean; didNotRun: boolean }) {
  if (status === 'done') return <CheckCircle2 aria-label="Complete" size={16} className="shrink-0 text-[--color-text-body]" />;
  if (status === 'running') return <Clock aria-label="In progress" size={16} className="shrink-0 text-[--color-primary]" />;
  if (status === 'incomplete') {
    if (didNotRun) return <Minus aria-label="Didn’t run" size={16} className="shrink-0 text-[--color-text-dismissed]" />;
    return (
      <XCircle
        aria-label="Not completed"
        size={16}
        className={cn('shrink-0', runFailed ? 'text-[--color-error]' : 'text-[--color-text-secondary]')}
      />
    );
  }
  return <Circle aria-label="Pending" size={16} className="shrink-0 text-[--color-text-dismissed]" />;
}
