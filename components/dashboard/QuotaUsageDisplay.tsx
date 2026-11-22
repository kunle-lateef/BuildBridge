import { cn } from '@/lib/cn';

type QuotaUsageDisplayProps = {
  planLabel: string;
  resetsOn: string;
  used: number;
  quota: number;
  activeCount: number;
  activeCap: number;
  /** The projected analyses this cycle, when that's over the quota; null otherwise. */
  projectedOver: number | null;
  className?: string;
};

/**
 * Settings' "Plan and usage" card (Figma `06 — Settings / Account`). Quota
 * is never a hidden limit the user only finds by hitting it; the pace line
 * (lib/plan-limits.ts's projectCycleUsage) warns before they do.
 */
export function QuotaUsageDisplay({
  planLabel, resetsOn, used, quota, activeCount, activeCap, projectedOver, className,
}: QuotaUsageDisplayProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-[8px] border border-[--color-border] bg-white p-4', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">{planLabel}</span>
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">Resets {resetsOn}</span>
      </div>
      <Meter label="Analyses this month" value={used} max={quota} barClass={projectedOver !== null ? 'bg-[--color-warning]' : 'bg-[--color-primary]'} />
      <Meter label="Active handoffs" value={activeCount} max={activeCap} barClass="bg-[--color-primary]" />
      {projectedOver !== null && (
        <p className="m-0 text-[12px] leading-4 text-[--color-error]">
          On pace for about {projectedOver} analyses this cycle, over your limit of {quota}.
        </p>
      )}
    </div>
  );
}

function Meter({ label, value, max, barClass }: { label: string; value: number; max: number; barClass: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-[14px] leading-5 text-[--color-text-primary]">
        <span>{label}</span>
        <span>{value} of {max}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-1 overflow-hidden rounded-full bg-[--color-surface]"
      >
        <div className={cn('h-full rounded-full', barClass)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
