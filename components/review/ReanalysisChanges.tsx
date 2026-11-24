'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { recordDesignerDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowRight, History } from '@/components/ui/icons';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { useToast } from '@/components/ui/ToastProvider';
import type { IssueSeverity } from '@/lib/types';

type ChangeRef = { id: string; title: string; severity: IssueSeverity };

export type ReanalysisConflict = ChangeRef & {
  /** What the designer had decided: Reject ("Not a gap") or Override (answered). */
  previous: { action: 'Reject' | 'Override'; label: string; decidedAt: string; answer: string | null } | null;
};

export type ReanalysisSummary = {
  runAt: string;
  isToday: boolean;
  /** Every change this run made, for "Re-analysis changed N findings". */
  changedCount: number;
  conflicts: ReanalysisConflict[];
  newGaps: ChangeRef[];
  stillFlagged: ChangeRef[];
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** The one-line notice at the top of the findings list. */
export function ReanalysisNotice({ summary, onOpen }: { summary: ReanalysisSummary; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] px-1 text-[14px] leading-5">
      <span className="flex items-center gap-2 text-[--color-primary]">
        <History aria-hidden="true" size={14} />
        Re-analysis changed {plural(summary.changedCount, 'finding')}
      </span>
      <button type="button" onClick={onOpen} className="text-[--color-primary] underline">
        Review changes
      </button>
    </div>
  );
}

/**
 * "Changes from today's re-analysis" (Figma `04 — Handoff / Review
 * changes`). A re-analysis never overwrites a designer's decision
 * (AGENTS.md #3): when it flags something the designer had closed, that
 * comes here as "Needs your call", and nothing changes until they choose.
 * Keep my decision records the same decision again; Reopen gap records a
 * Confirm, which puts the gap back in review.
 */
export function ReanalysisChangesPanel({ summary, onBack }: { summary: ReanalysisSummary; onBack: () => void }) {
  const time = new Date(summary.runAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const counts = [
    summary.conflicts.length > 0 && plural(summary.conflicts.length, 'conflict'),
    summary.newGaps.length > 0 && plural(summary.newGaps.length, 'new gap'),
    summary.stillFlagged.length > 0 && `${summary.stillFlagged.length} still flagged`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-[--color-border] px-3 py-3">
        <button type="button" onClick={onBack} aria-label="Back to findings" className="rounded-[4px] p-1 text-[--color-text-secondary] hover:bg-[--color-surface]">
          <ArrowRight aria-hidden="true" size={14} className="rotate-180" />
        </button>
        <h2 className="m-0 flex-1 text-[14px] font-medium leading-5 text-[--color-text-primary]">
          Changes from {summary.isToday ? 'today’s' : `the ${shortDate(summary.runAt)}`} re-analysis
        </h2>
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">{time}</span>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">
          {counts.join(', ')}. Nothing you decided was changed.
        </p>

        {summary.conflicts.length > 0 && (
          <Section label={`Needs your call · ${summary.conflicts.length}`}>
            {summary.conflicts.map((conflict) => <ConflictCard key={conflict.id} conflict={conflict} />)}
          </Section>
        )}

        {summary.newGaps.length > 0 && (
          <Section label={`New gaps · ${summary.newGaps.length}`}>
            {summary.newGaps.map((gap) => (
              <a
                key={gap.id}
                href={`#issue-${gap.id}`}
                onClick={onBack}
                className="flex items-center gap-2 rounded-[8px] border border-[--color-border] bg-white px-3 py-2.5 text-[14px] leading-5 text-[--color-text-primary] hover:bg-[--color-background]"
              >
                <SeverityBadge severity={gap.severity} />
                {gap.title}
              </a>
            ))}
          </Section>
        )}

        {summary.stillFlagged.length > 0 && (
          <Section label={`Still flagged · ${summary.stillFlagged.length}`}>
            <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
              {summary.stillFlagged.map((gap) => gap.title).join(' · ')}
            </p>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[--color-text-secondary]">{label}</h3>
      {children}
    </section>
  );
}

function ConflictCard({ conflict }: { conflict: ReanalysisConflict }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previous = conflict.previous;

  async function decide(action: 'Confirm' | 'Reject' | 'Override', message: string, newValue?: string) {
    setIsBusy(true);
    setError(null);
    const result = await recordDesignerDecision({ findingType: 'HandoffIssue', findingReference: conflict.id, action, newValue });
    setIsBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast(message);
    router.refresh();
  }

  // Keeping an answer re-records the same answer; without the answer text
  // there's nothing to re-record, so only Reopen is offered.
  const canKeep = previous && (previous.action === 'Reject' || (previous.action === 'Override' && previous.answer));

  return (
    <div className="flex flex-col gap-2 rounded-[8px] border border-[--color-border] border-l-[3px] border-l-[--color-text-body] bg-white px-3 py-3">
      <div className="flex items-center gap-2 text-[14px] leading-5 text-[--color-text-primary]">
        <SeverityBadge severity={conflict.severity} />
        {conflict.title}
      </div>
      <p className="m-0 text-[12px] leading-4 text-[--color-text-body]">
        {previous
          ? `You marked this “${previous.label}” on ${shortDate(previous.decidedAt)}. This run flagged it again. Your decision stays until you choose.`
          : 'You had closed this. This run flagged it again. Your decision stays until you choose.'}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {canKeep && previous && (
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={() =>
              void (previous.action === 'Reject'
                ? decide('Reject', 'Kept as not a gap')
                : decide('Override', 'Kept your answer', previous.answer ?? undefined))
            }
          >
            Keep my decision
          </Button>
        )}
        <Button type="button" disabled={isBusy} onClick={() => void decide('Confirm', 'Gap reopened')}>
          Reopen gap
        </Button>
      </div>
      {error && (
        <p role="alert" className="m-0 flex items-center gap-2 text-[12px] text-[--color-error]">
          <AlertCircle aria-hidden="true" size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
