import { CheckCircle2 } from 'lucide-react';

/**
 * Read-only twin of components/handoff/ImplementationMarkButton.tsx's
 * "already marked" state, for the designer-side review page — the designer
 * never sets this themselves, only sees what a developer claimed through
 * the public share link. Deliberately NOT styled as a solid-fill pill like
 * ReviewStatusBadge's Confirmed/Resolved — an unverified developer claim,
 * not designer-verified ground truth. See prisma/schema.prisma's
 * ImplementationMark model for the full rationale.
 */
export function ImplementedIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[--radius-sm] border border-dashed border-[--color-border] px-1.5 py-0.5 text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-secondary]"
      title="Marked by a developer through the share link — not verified by you"
    >
      <CheckCircle2 aria-hidden="true" size={12} />
      Developer says: Implemented
    </span>
  );
}
