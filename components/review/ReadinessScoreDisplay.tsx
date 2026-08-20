import { AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

import { cn } from '@/lib/cn';

type ReadinessScoreDisplayProps = {
  score: number;
  hasUnresolvedCritical: boolean;
  unresolvedCriticalCount: number;
  algorithmVersion: number;
  /** The single highest-impact issue to resolve next — see lib/readiness.ts's rankNextBestActions. */
  topAction?: { issueId: string; projectedOverall: number; delta: number } | null;
  className?: string;
};

/**
 * Always shows the hard-gate state alongside the percentage — never the
 * number alone. A handoff with an unresolved Critical issue must never
 * read as "ready" regardless of how high the score is. See
 * .agents/rules/design-system.md's ReadinessScore spec and Example 4 in
 * the product prompt.
 */
export function ReadinessScoreDisplay({
  score,
  hasUnresolvedCritical,
  unresolvedCriticalCount,
  algorithmVersion,
  topAction,
  className,
}: ReadinessScoreDisplayProps) {
  const state = hasUnresolvedCritical ? 'blocked' : score === 100 ? 'ready' : 'in-review';

  const colorClass =
    state === 'blocked'
      ? 'text-[--color-error]'
      : state === 'ready'
        ? 'text-[--color-success]'
        : 'text-[--color-text-secondary]';

  // The number itself stays high-contrast for the common "in-review" case
  // (a wash of muted gray would undersell the page's single most important
  // metric) — only tinted when the state is genuinely alarming or
  // rewarding. The label text still always carries the full state color.
  const scoreColorClass = state === 'in-review' ? 'text-[--color-text-primary]' : colorClass;

  const Icon = state === 'blocked' ? AlertOctagon : state === 'ready' ? CheckCircle2 : Clock;

  const label =
    state === 'blocked'
      ? `Not ready — ${unresolvedCriticalCount} critical issue${unresolvedCriticalCount === 1 ? '' : 's'} unresolved`
      : state === 'ready'
        ? 'Ready'
        : 'Needs review';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'font-mono text-[length:var(--font-desktop-heading-1-bold-size)] font-bold',
            scoreColorClass,
          )}
        >
          {score}%
        </span>
        <span className={cn('flex items-center gap-1.5', colorClass)}>
          <Icon aria-hidden="true" size={16} />
          {label}
        </span>
        <span className="text-[--color-text-muted]">(v{algorithmVersion})</span>
      </div>
      {/* delta 0 is a legitimate outcome (a category can already be floored
          by other issues) — only show the link when resolving the top issue
          genuinely moves the number, never implying "nothing else matters"
          about the hard gate. */}
      {topAction && topAction.delta > 0 && (
        <a href={`#issue-${topAction.issueId}`} className="text-[--color-primary] underline">
          Resolving the top issue would raise this to {topAction.projectedOverall}%
        </a>
      )}
    </div>
  );
}
