'use client';

import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { cn } from '@/lib/cn';
import type { AnalysisRunStatus } from '@/lib/types';

export type StageProgress = {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'incomplete';
  countLabel: string;
  provenanceSplit?: { detected: number; inferred: number; suggested: number };
};

type AnalysisProgressPanelProps = {
  runStatus: AnalysisRunStatus;
  stages: StageProgress[];
  className?: string;
};

const POLL_INTERVAL_MS = 4000;

/**
 * Itemized per-stage progress display, replacing a bare "Analyzing…"
 * spinner — see .agents/rules/reference-inspiration.md's Cursor-derived
 * pattern. There's no push channel in this stack (no WebSockets/SSE), so
 * this polls via router.refresh() while the run is active; the counts and
 * stage rows themselves are computed server-side from persisted rows, not
 * client state, so a refresh is always a true reflection of pipeline
 * progress rather than an optimistic guess.
 */
export function AnalysisProgressPanel({ runStatus, stages, className }: AnalysisProgressPanelProps) {
  const router = useRouter();
  const isActive = runStatus === 'Queued' || runStatus === 'Processing';
  const completedCount = stages.filter((stage) => stage.status === 'done').length;

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive, router]);

  return (
    <div className={cn('flex flex-col gap-2 rounded-[--radius-lg] border border-[--color-border] p-4', className)}>
      <h2 className="text-[--color-text-primary]">Analysis progress</h2>
      {/* Never let an itemized stage list read as "everything succeeded" on
          a run that didn't — see the PRD's partial-analysis acceptance
          criteria and edge case: present as explicitly partial, with a
          count, never silently as complete. */}
      {runStatus === 'PartiallyCompleted' && (
        <p className="flex items-center gap-1.5 rounded-[--radius-md] bg-[--color-warning-light] px-3 py-2 text-[--color-warning]">
          <AlertTriangle aria-hidden="true" size={16} />
          Only {completedCount} of {stages.length} stages completed — the rest need manual review. See the
          stage list below for which ones.
        </p>
      )}
      {runStatus === 'Failed' && (
        <p className="flex items-center gap-1.5 rounded-[--radius-md] bg-[--color-error-light] px-3 py-2 text-[--color-error]">
          <AlertTriangle aria-hidden="true" size={16} />
          Analysis failed — no stages completed. Try running it again.
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {stages.map((stage) => (
          <li key={stage.key} className="flex items-center gap-2 py-1">
            <StageIcon status={stage.status} />
            <span className="text-[--color-text-body]">{stage.label}</span>
            <span className="ml-auto flex items-center gap-2 text-[--color-text-secondary]">
              <span>{stage.countLabel}</span>
              {stage.provenanceSplit && (
                <span className="font-mono text-[--color-text-muted]">
                  {stage.provenanceSplit.detected}D / {stage.provenanceSplit.inferred}I /{' '}
                  {stage.provenanceSplit.suggested}S
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StageIcon({ status }: { status: StageProgress['status'] }) {
  if (status === 'done') {
    return <CheckCircle2 aria-label="Complete" size={16} className="shrink-0 text-[--color-success]" />;
  }

  if (status === 'running') {
    return (
      <Loader2
        aria-label="In progress"
        size={16}
        className="shrink-0 animate-spin text-[--color-primary] motion-reduce:animate-none"
      />
    );
  }

  if (status === 'incomplete') {
    return <XCircle aria-label="Not completed" size={16} className="shrink-0 text-[--color-error]" />;
  }

  return <CircleDashed aria-label="Pending" size={16} className="shrink-0 text-[--color-text-muted]" />;
}
