import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertOctagon, AlertTriangle, Info, Lightbulb } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { IssueSeverity } from '@/lib/types';

const severityBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[--radius-sm] px-2 py-0.5 text-[length:var(--font-desktop-caption-medium-size)] font-medium',
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

const ICON: Record<IssueSeverity, typeof AlertOctagon> = {
  Critical: AlertOctagon,
  High: AlertTriangle,
  Medium: AlertCircle,
  Low: Info,
  Recommendation: Lightbulb,
};

type SeverityBadgeProps = VariantProps<typeof severityBadgeVariants> & {
  severity: IssueSeverity;
  className?: string;
};

/**
 * Never color alone — always paired with an icon, per
 * .agents/rules/design-system.md's SeverityBadge spec.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const Icon = ICON[severity];

  return (
    <span
      className={cn(severityBadgeVariants({ severity }), className)}
      aria-label={`${severity} severity`}
    >
      <Icon aria-hidden="true" size={12} />
      {severity}
    </span>
  );
}
