import { cn } from '@/lib/cn';
import type { PlanTier } from '@/lib/types';

type QuotaUsageDisplayProps = {
  used: number;
  quota: number;
  planTier: PlanTier;
  cycleResetsAt: string;
  className?: string;
};

/**
 * Quota is never a hidden constraint the user only discovers by hitting it
 * — see .agents/skills/api-route-scaffolder/SKILL.md's Step 6.
 */
export function QuotaUsageDisplay({ used, quota, planTier, cycleResetsAt, className }: QuotaUsageDisplayProps) {
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
    </div>
  );
}
