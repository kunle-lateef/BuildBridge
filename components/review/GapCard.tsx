'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { recordDesignerDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowRight } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import type { IssueSeverity, IssueStatus, ProvenanceType } from '@/lib/types';

export type PanelGap = {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  provenance: ProvenanceType;
  recommendation: string | null;
  status: IssueStatus;
  /** "Checkout · Pay button": the screen and component the gap belongs to, when known. */
  where: string | null;
  /** The designer's saved answer (lib/gapAnswers.ts), once there is one. */
  answer: string | null;
  /** Readiness points gained by resolving just this gap (lib/readiness.ts rankNextBestActions). */
  delta: number;
};

export const isOpenGap = (gap: Pick<PanelGap, 'status'>) => gap.status === 'Open' || gap.status === 'InReview';

type GapCardProps = {
  gap: PanelGap;
  /** "Makes it ready" / "+n%", or null when answering changes nothing. */
  impact: string | null;
  isLast: boolean;
};

/**
 * One gap in the Findings panel. Closed, it's a compact row; open, it's the
 * answer card from Figma `04 — Handoff` → "Review — Gap selected":
 *
 * - Save answer records an Override with the answer, which resolves the gap
 *   (lib/decisions.ts). Developers see the answer as the confirmed behavior.
 * - Keep open records a Confirm: the gap is real and stays on the list.
 * - Not a gap records a Reject, which dismisses it.
 *
 * Every choice is a DesignerDecision, so a later analysis never overwrites
 * it (AGENTS.md #3).
 */
export function GapCard({ gap, impact, isLast }: GapCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [answer, setAnswer] = useState(gap.answer ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpenStatus = isOpenGap(gap);

  async function decide(action: 'Override' | 'Confirm' | 'Reject', message: string, newValue?: string) {
    setIsSubmitting(true);
    setError(null);
    const result = await recordDesignerDecision({ findingType: 'HandoffIssue', findingReference: gap.id, action, newValue });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setIsOpen(false);
    toast(message);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <div id={`issue-${gap.id}`} className={cn('scroll-mt-20', !isLast && 'border-b border-[--color-border]')}>
        <button
          type="button"
          data-review-nav="gap"
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          className="flex w-full items-center gap-2 p-3 text-left hover:bg-[--color-background]"
        >
          <SeverityBadge severity={gap.severity} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[--color-text-primary]">
            {gap.title}
          </span>
          {impact && (
            <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-medium leading-4 tracking-[0.2px] text-[--color-success]">
              <ArrowRight aria-hidden="true" size={12} />
              {impact}
            </span>
          )}
          {!isOpenStatus && <ReviewStatusBadge status={gap.status} />}
          <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-[--color-text-secondary]" />
        </button>
      </div>
    );
  }

  const answerError = answer.trim().length === 0 ? 'Write the answer first.' : null;

  return (
    <div
      id={`issue-${gap.id}`}
      className="m-[-1px] flex scroll-mt-20 flex-col gap-2 rounded-[8px] border-[1.5px] border-[--color-error] bg-white px-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4 text-[--color-text-secondary]">
        <SeverityBadge severity={gap.severity} />
        <ProvenanceBadge provenance={gap.provenance} />
        {gap.where && <span>{gap.where}</span>}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close"
          className="ml-auto text-[--color-text-secondary] hover:text-[--color-text-primary]"
        >
          <ArrowRight aria-hidden="true" size={16} className="rotate-90" />
        </button>
      </div>

      <h4 className="m-0 pt-1 text-[16px] font-semibold leading-6 text-[--color-text-primary]">{gap.title}</h4>
      <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">{gap.description}</p>
      {gap.recommendation && (
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
          <span className="font-semibold text-[--color-text-body]">Suggested fix:</span> {gap.recommendation}
        </p>
      )}
      {impact === 'Makes it ready' && (
        <span className="text-[12px] font-medium leading-4 text-[--color-text-body]">→ Answering this makes the handoff ready</span>
      )}

      {isOpenStatus ? (
        <>
          <label htmlFor={`answer-${gap.id}`} className="pt-2 text-[14px] font-medium leading-5 text-[--color-text-body]">
            Your answer
          </label>
          <textarea
            id={`answer-${gap.id}`}
            value={answer}
            onChange={(event) => setAnswer(event.currentTarget.value)}
            rows={4}
            maxLength={2000}
            autoFocus
            className="rounded-[8px] border border-[--color-border] bg-white px-3 py-2.5 text-[14px] leading-5 text-[--color-text-body]"
          />
          <span className="text-[12px] leading-4 text-[--color-text-secondary]">
            Developers see this as the confirmed behavior.
          </span>
          {error && (
            <p role="alert" className="m-0 flex items-center gap-1.5 text-[14px] font-medium leading-5 text-[--color-error]">
              <AlertCircle aria-hidden="true" size={14} />
              {error}
            </p>
          )}
          <div className="flex items-center gap-1 pt-1">
            <Button
              type="button"
              disabled={isSubmitting || Boolean(answerError)}
              onClick={() => void decide('Override', 'Answer saved.', answer.trim())}
            >
              {isSubmitting ? 'Saving…' : 'Save answer'}
            </Button>
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-4 border-t border-[--color-border] pt-3 text-[14px] leading-5">
            <span className="text-[--color-text-secondary]">Or:</span>
            {gap.status === 'Open' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void decide('Confirm', 'Kept open.')}
                className="font-medium text-[--color-text-body] hover:underline"
              >
                Keep open
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void decide('Reject', 'Marked as not a gap.')}
              className="font-medium text-[--color-text-body] hover:underline"
            >
              Not a gap
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1 pt-1 text-[14px] leading-5">
          <ReviewStatusBadge status={gap.status} />
          {gap.answer && (
            <p className="m-0 text-[--color-text-body]">
              <span className="font-medium">Your answer:</span> {gap.answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
