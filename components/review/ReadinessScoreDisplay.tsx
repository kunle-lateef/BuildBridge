import { AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

import { cn } from '@/lib/cn';

type ReadinessScoreDisplayProps = {
  score: number;
  hasUnresolvedCritical: boolean;
  unresolvedCriticalCount: number;
  algorithmVersion: number;
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
  className,
}: ReadinessScoreDisplayProps) {
  const state = hasUnresolvedCritical ? 'blocked' : score === 100 ? 'ready' : 'in-review';

  const colorClass =
    state === 'blocked'
      ? 'text-[--color-error]'
      : state === 'ready'
        ? 'text-[--color-success]'
        : 'text-[--color-text-secondary]';

  const Icon = state === 'blocked' ? AlertOctagon : state === 'ready' ? CheckCircle2 : Clock;

  const label =
    state === 'blocked'
      ? `Not ready — ${unresolvedCriticalCount} critical issue${unresolvedCriticalCount === 1 ? '' : 's'} unresolved`
      : state === 'ready'
        ? 'Ready'
        : 'Needs review';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="font-mono text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        {score}%
      </span>
      <span className={cn('flex items-center gap-1.5', colorClass)}>
        <Icon aria-hidden="true" size={16} />
        {label}
      </span>
      <span className="text-[--color-text-muted]">(v{algorithmVersion})</span>
    </div>
  );
}
