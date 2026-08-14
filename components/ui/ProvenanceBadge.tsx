import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

const provenanceBadgeVariants = cva(
  'inline-flex items-center rounded-[--radius-sm] px-2 py-0.5 text-[length:var(--font-desktop-caption-medium-size)] font-medium',
  {
    variants: {
      provenance: {
        Detected: 'bg-[--color-detected-light] text-[--color-detected]',
        Inferred: 'bg-[--color-inferred-light] text-[--color-inferred]',
        Suggested: 'bg-[--color-ai-suggested-light] text-[--color-ai-suggested]',
      } satisfies Record<ProvenanceType, string>,
    },
  },
);

type ProvenanceBadgeProps = VariantProps<typeof provenanceBadgeVariants> & {
  provenance: ProvenanceType;
  className?: string;
};

const LABEL: Record<ProvenanceType, string> = {
  Detected: 'Detected',
  Inferred: 'Inferred',
  Suggested: 'Suggested',
};

const ARIA_LABEL: Record<ProvenanceType, string> = {
  Detected: 'Detected directly from the design',
  Inferred: 'Inferred from visual evidence, not certain',
  Suggested: 'AI suggestion, not a confirmed observation',
};

/**
 * The only component that should ever render a Detected/Inferred/Suggested
 * indicator — see .agents/skills/component-builder/SKILL.md. Never hardcode
 * a provenance color anywhere else. Visible in the default state, never
 * hidden behind a hover — see AGENTS.md's Non-Negotiable #2.
 */
export function ProvenanceBadge({ provenance, className }: ProvenanceBadgeProps) {
  return (
    <span
      className={cn(provenanceBadgeVariants({ provenance }), className)}
      aria-label={ARIA_LABEL[provenance]}
    >
      {LABEL[provenance]}
    </span>
  );
}
