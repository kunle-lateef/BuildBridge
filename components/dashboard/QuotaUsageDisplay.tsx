import { cn } from '@/lib/cn';
import { projectCycleUsage } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/types';

type QuotaUsageDisplayProps = {
  used: number;
  quota: number;
  planTier: PlanTier;
  cycleStartsAt: string;
  cycleResetsAt: string;
  className?: string;
};

/**
 * Quota is never a hidden constraint the user only discovers by hitting it
 * — see .agents/skills/api-route-scaffolder/SKILL.md's Step 6. The
 * projected-usage nudge extends that: surfaced from the current pace
 * (lib/plan-limits.ts's projectCycleUsage), not just the static count, so
 * a designer sees they're headed for the ceiling before they hit it.
 */
export function QuotaUsageDisplay({ used, quota, planTier, cycleStartsAt, cycleResetsAt, className }: QuotaUsageDisplayProps) {
  const projected = projectCycleUsage(used, new Date(cycleStartsAt), new Date(cycleResetsAt));
  const onPaceToExceed = planTier === 'Free' && projected > quota;

  return (
    <div className={cn('flex flex-col gap-1 rounded-[--radius-lg] border border-[--color-border] p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[--color-text-body]">
          {used} of {quota} analyses used this month
        </span>
        <span className="text-[--color-text-muted]">{planTier} plan</span>
      </div>
      <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
        Resets {new Date(cycleResetsAt).toLocaleDateString()}
      </span>
      {onPaceToExceed && (
        <p className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-warning]">
          On pace for ~{projected} this cycle — above your plan&rsquo;s limit. Consider upgrading.
        </p>
      )}
    </div>
  );
}
