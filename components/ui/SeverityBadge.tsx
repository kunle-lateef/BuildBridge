import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';
import type { IssueSeverity } from '@/lib/types';

const severityBadgeVariants = cva(
  'inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[--radius-sm] px-2 text-[12px] font-medium leading-4',
  {
    variants: {
      severity: {
        Critical: 'bg-[--color-error-light] text-[--color-error]',
        High: 'bg-[--color-severity-high-light] text-[--color-severity-high]',
        Medium: 'bg-[--color-warning-light] text-[--color-warning]',
        Low: 'bg-[--color-info-light] text-[--color-info]',
        Recommendation: 'bg-[--color-info-light] text-[--color-info]',
      } satisfies Record<IssueSeverity, string>,
    },
  },
);

type SeverityBadgeProps = VariantProps<typeof severityBadgeVariants> & {
  severity: IssueSeverity;
  className?: string;
};

/**
 * Matches Figma's SeverityBadge component (Foundations): a dot plus the
 * severity word. The word itself means the badge never relies on colour alone.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(severityBadgeVariants({ severity }), className)}
      aria-label={`${severity} severity`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {severity}
    </span>
  );
}
