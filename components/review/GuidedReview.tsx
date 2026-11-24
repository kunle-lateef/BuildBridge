'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { bulkRecordDecision, recordDesignerDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button, buttonVariants } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import type { FindingType, IssueSeverity, ProvenanceType } from '@/lib/types';

export type GuidedGroup = 'Gaps' | 'Inferred' | 'Suggested' | 'Detected';

export type GuidedItem = {
  key: string;
  findingType: FindingType;
  id: string;
  group: GuidedGroup;
  title: string;
  value: string;
  where: string | null;
  provenance: ProvenanceType;
  severity?: IssueSeverity;
  description?: string;
  recommendation?: string | null;
  /** True on the one open critical gap whose answer makes the handoff ready. */
  makesReady?: boolean;
  pin: { screenId: string; key: string } | null;
};

const GROUPS: GuidedGroup[] = ['Gaps', 'Inferred', 'Suggested', 'Detected'];

// Same evidence wording as the home page's Accuracy section.
const WHY: Record<ProvenanceType, string> = {
  Detected: 'Detected: read directly from the design.',
  Inferred: 'Inferred: reasoned from visual evidence, not shown directly. Check it before you confirm.',
  Suggested: 'Suggested: a best guess where the design doesn’t say. You decide whether to keep it.',
};

type Tally = { confirmed: number; modified: number; rejected: number; answered: number };

type GuidedReviewProps = {
  handoffId: string;
  /** Everything still to review, straight from the server; shrinks as decisions land. */
  items: GuidedItem[];
  /** True while an open critical gap blocks sharing. */
  isBlocked: boolean;
  onFocus: (pin: GuidedItem['pin']) => void;
  onExit: () => void;
  /** The share dialog trigger, for the finish screen. */
  shareButton: ReactNode;
  /** The example handoff's finish screen: "That's the whole loop". */
  isExample?: boolean;
};

/**
 * Guided review (Figma `04 — Handoff` → "Guided review — 1…4"): one finding
 * at a time, gaps first, then Inferred, Suggested, and Detected values in
 * one ticked pass. Every choice is a normal DesignerDecision; skipping
 * records nothing, so a skipped finding simply stays not decided.
 */
export function GuidedReview({ handoffId, items, isBlocked, onFocus, onExit, shareButton, isExample = false }: GuidedReviewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [initialGroupCounts] = useState(() =>
    Object.fromEntries(GROUPS.map((group) => [group, items.filter((item) => item.group === group).length])) as Record<
      GuidedGroup,
      number
    >,
  );
  const total = GROUPS.reduce((sum, group) => sum + initialGroupCounts[group], 0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [oneByOne, setOneByOne] = useState<Set<string>>(new Set());
  const [tally, setTally] = useState<Tally>({ confirmed: 0, modified: 0, rejected: 0, answered: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = items.filter((item) => !skipped.includes(item.key));
  const single = pending.filter((item) => item.group !== 'Detected' || oneByOne.has(item.key));
  const ordered = GROUPS.flatMap((group) =>
    group === 'Detected'
      ? single.filter((item) => item.group === 'Detected')
      : single.filter((item) => item.group === group),
  );
  const batch = pending.filter((item) => item.group === 'Detected' && !oneByOne.has(item.key));
  const current = ordered.filter((item) => item.group !== 'Detected')[0] ?? null;
  const step: 'single' | 'batch' | 'detectedSingle' | 'done' = current
    ? 'single'
    : batch.length > 0
      ? 'batch'
      : ordered.length > 0
        ? 'detectedSingle'
        : 'done';
  const active = step === 'single' ? current : step === 'detectedSingle' ? ordered[0] : null;
  const upNext = step === 'single' ? (ordered[1] ?? batch[0] ?? null) : step === 'detectedSingle' ? (ordered[1] ?? null) : null;

  const doneCount = total - pending.length;
  const position = Math.min(total, doneCount + 1);

  useEffect(() => {
    onFocus(active?.pin ?? (step === 'batch' ? (batch[0]?.pin ?? null) : null));
    // Only when the finding in front of the designer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key, step]);

  const decide = useCallback(
    async (item: GuidedItem, action: 'Confirm' | 'Modify' | 'Reject' | 'Override', newValue?: string) => {
      setIsSubmitting(true);
      setError(null);
      const result = await recordDesignerDecision({ findingType: item.findingType, findingReference: item.id, action, newValue });
      setIsSubmitting(false);
      if (!result.ok) {
        setError(result.error.message);
        return false;
      }
      setTally((prev) => ({
        confirmed: prev.confirmed + (action === 'Confirm' && item.group !== 'Gaps' ? 1 : 0),
        modified: prev.modified + (action === 'Modify' ? 1 : 0),
        rejected: prev.rejected + (action === 'Reject' ? 1 : 0),
        answered: prev.answered + (action === 'Override' ? 1 : 0),
      }));
      router.refresh();
      return true;
    },
    [router],
  );

  const skip = useCallback((item: GuidedItem) => setSkipped((prev) => [...prev, item.key]), []);
  const back = useCallback(() => setSkipped((prev) => prev.slice(0, -1)), []);

  async function confirmBatch(ticked: GuidedItem[], unticked: GuidedItem[]) {
    setIsSubmitting(true);
    setError(null);
    const byType = new Map<FindingType, string[]>();
    for (const item of ticked) byType.set(item.findingType, [...(byType.get(item.findingType) ?? []), item.id]);
    for (const [findingType, refs] of byType) {
      const result = await bulkRecordDecision({ handoffId, findingType, provenance: 'Detected', action: 'Confirm', findingReferences: refs });
      if (!result.ok) {
        setIsSubmitting(false);
        setError(result.error.message);
        return;
      }
    }
    setIsSubmitting(false);
    setOneByOne((prev) => new Set([...prev, ...unticked.map((item) => item.key)]));
    setTally((prev) => ({ ...prev, confirmed: prev.confirmed + ticked.length }));
    toast(`${ticked.length} ${ticked.length === 1 ? 'value' : 'values'} confirmed`);
    router.refresh();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onExit();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit]);

  return (
    <aside className="flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[--color-border] bg-white xl:max-h-[calc(100vh-120px)]">
      <div className="flex flex-col gap-2 border-b border-[--color-border] px-5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px] leading-5">
            <span className="font-medium text-[--color-text-primary]">{step === 'done' ? 'Review finished' : 'Reviewing'}</span>
            <span className="ml-2 text-[--color-text-secondary]">
              {step === 'done' ? total : position} of {total}
            </span>
          </span>
          <button type="button" onClick={onExit} className="flex items-center gap-1.5 text-[14px] leading-5 text-[--color-text-secondary] hover:text-[--color-text-primary]">
            Exit <Kbd>Esc</Kbd>
          </button>
        </div>
        <div className="flex gap-1">
          {GROUPS.filter((group) => initialGroupCounts[group] > 0).map((group) => {
            const remaining = pending.filter((item) => item.group === group).length;
            const done = initialGroupCounts[group] - remaining;
            return (
              <span key={group} className="h-1 overflow-hidden rounded-full bg-[--color-surface]" style={{ flex: initialGroupCounts[group] }}>
                <span className="block h-full rounded-full bg-[--color-primary]" style={{ width: `${(done / initialGroupCounts[group]) * 100}%` }} />
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 text-[12px] leading-4 text-[--color-text-body]">
          {GROUPS.filter((group) => initialGroupCounts[group] > 0).map((group) => (
            <span key={group}>
              {group} {initialGroupCounts[group]}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {error && (
          <p role="alert" className="m-0 mb-3 flex items-center gap-1.5 text-[14px] font-medium leading-5 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {error}
          </p>
        )}

        {active && active.group === 'Gaps' && (
          <GapStep key={active.key} item={active} index={initialGroupCounts.Gaps - pending.filter((item) => item.group === 'Gaps').length + 1} total={initialGroupCounts.Gaps} disabled={isSubmitting}
            onAnswer={(answer) => void decide(active, 'Override', answer)}
            onNotAGap={() => void decide(active, 'Reject')}
            onSkip={() => skip(active)}
          />
        )}

        {active && active.group !== 'Gaps' && (
          <ValueStep key={active.key} item={active}
            index={initialGroupCounts[active.group] - pending.filter((item) => item.group === active.group).length + 1}
            total={initialGroupCounts[active.group]}
            disabled={isSubmitting}
            onConfirm={() => void decide(active, 'Confirm')}
            onModify={(value) => void decide(active, 'Modify', value)}
            onReject={() => void decide(active, 'Reject')}
            onSkip={() => skip(active)}
            onBack={skipped.length > 0 ? back : undefined}
          />
        )}

        {step === 'batch' && (
          <DetectedBatch key={batch.map((item) => item.key).join(',')} items={batch} disabled={isSubmitting}
            onConfirm={(ticked, unticked) => void confirmBatch(ticked, unticked)}
            onOneByOne={() => setOneByOne((prev) => new Set([...prev, ...batch.map((item) => item.key)]))}
          />
        )}

        {step === 'done' && (
          <FinishStep
            tally={tally}
            skipped={items.filter((item) => skipped.includes(item.key))}
            isBlocked={isBlocked}
            isExample={isExample}
            shareButton={shareButton}
            onReviewSkipped={() => setSkipped([])}
          />
        )}
      </div>

      {step !== 'done' && (
        <div className="flex flex-col gap-2 border-t border-[--color-border] px-5 py-3 text-[12px] leading-4 text-[--color-text-secondary]">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {step === 'batch' ? (
              <>
                <Hint k="⌘↵">confirm ticked</Hint>
                <Hint k="Space">tick / untick</Hint>
              </>
            ) : active?.group === 'Gaps' ? (
              <>
                <Hint k="⌘↵">save</Hint>
                <Hint k="S">skip</Hint>
                <Hint k="N">not a gap</Hint>
              </>
            ) : (
              <>
                <Hint k="C">confirm</Hint>
                <Hint k="M">modify</Hint>
                <Hint k="R">reject</Hint>
                <Hint k="S">skip</Hint>
                {skipped.length > 0 && <Hint k="←">back</Hint>}
              </>
            )}
          </span>
          {upNext && (
            <span>
              Up next <span className="font-medium text-[--color-text-body]">{upNext.title} · {upNext.group === 'Gaps' ? upNext.severity : upNext.group}</span>
            </span>
          )}
        </div>
      )}
    </aside>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[4px] border border-[--color-border] px-1 py-px font-sans text-[12px] leading-4 text-[--color-text-secondary]">
      {children}
    </kbd>
  );
}

function Hint({ k, children }: { k: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Kbd>{k}</Kbd>
      {children}
    </span>
  );
}

function StepLabel({ children }: { children: ReactNode }) {
  return <span className="text-[12px] font-semibold uppercase leading-4 tracking-[1.5px] text-[--color-text-secondary]">{children}</span>;
}

/** Ignores shortcut keys typed into a field. */
function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  return target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT';
}

function GapStep({ item, index, total, disabled, onAnswer, onNotAGap, onSkip }: {
  item: GuidedItem; index: number; total: number; disabled: boolean;
  onAnswer: (answer: string) => void; onNotAGap: () => void; onSkip: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const canSave = answer.trim().length > 0 && !disabled;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSave) onAnswer(answer.trim());
      if (isTyping(event)) return;
      if (event.key === 's' || event.key === 'S') onSkip();
      if (event.key === 'n' || event.key === 'N') onNotAGap();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [answer, canSave, onAnswer, onNotAGap, onSkip]);

  return (
    <div className="flex flex-col gap-3">
      <StepLabel>Gaps · {index} of {total}</StepLabel>
      <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4 text-[--color-text-secondary]">
        {item.severity && <SeverityBadge severity={item.severity} />}
        <ProvenanceBadge provenance={item.provenance} />
        {item.where && <span>{item.where}</span>}
      </div>
      <h3 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">{item.title}</h3>
      {item.description && <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">{item.description}</p>}
      {item.recommendation && <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">Suggested fix: {item.recommendation}</p>}
      {item.makesReady && <span className="text-[12px] font-medium leading-4 text-[--color-text-body]">→ Answering this makes the handoff ready</span>}
      <label htmlFor={`guided-answer-${item.id}`} className="pt-1 text-[14px] font-medium leading-5 text-[--color-text-body]">Your answer</label>
      <textarea
        id={`guided-answer-${item.id}`}
        value={answer}
        onChange={(event) => setAnswer(event.currentTarget.value)}
        rows={3}
        maxLength={2000}
        autoFocus
        className="rounded-[8px] border border-[--color-border] bg-white px-3 py-2.5 text-[14px] leading-5 text-[--color-text-body]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!canSave} onClick={() => onAnswer(answer.trim())}>Save answer</Button>
        <Button type="button" variant="secondary" disabled={disabled} onClick={onNotAGap}>Not a gap</Button>
        <button type="button" disabled={disabled} onClick={onSkip} className="px-2 text-[14px] leading-5 text-[--color-text-secondary] hover:text-[--color-text-primary]">Skip for now</button>
      </div>
    </div>
  );
}

function ValueStep({ item, index, total, disabled, onConfirm, onModify, onReject, onSkip, onBack }: {
  item: GuidedItem; index: number; total: number; disabled: boolean;
  onConfirm: () => void; onModify: (value: string) => void; onReject: () => void; onSkip: () => void; onBack?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.value);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isEditing) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && value.trim()) onModify(value.trim());
        return;
      }
      if (isTyping(event) || disabled) return;
      const key = event.key.toLowerCase();
      if (key === 'c') onConfirm();
      if (key === 'm') { event.preventDefault(); setIsEditing(true); }
      if (key === 'r') onReject();
      if (key === 's') onSkip();
      if (event.key === 'ArrowLeft' && onBack) onBack();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [disabled, isEditing, onBack, onConfirm, onModify, onReject, onSkip, value]);

  return (
    <div className="flex flex-col gap-3">
      <StepLabel>{item.group} · {index} of {total}</StepLabel>
      <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4 text-[--color-text-secondary]">
        <ProvenanceBadge provenance={item.provenance} />
        {item.where && <span>{item.where}</span>}
      </div>
      <h3 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">{item.title}</h3>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`guided-value-${item.id}`} className="text-[14px] font-medium leading-5 text-[--color-text-body]">Your value</label>
          <input
            id={`guided-value-${item.id}`}
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            autoFocus
            className="h-[42px] rounded-[8px] border border-[--color-border] bg-white px-3 font-mono text-[13px] text-[--color-text-primary]"
          />
          <span className="text-[12px] leading-4 text-[--color-text-secondary]">
            Was {item.value} ({item.provenance}). Developers will see your value marked “Modified by designer”.
          </span>
          <div className="flex gap-1">
            <Button type="button" disabled={disabled || !value.trim()} onClick={() => onModify(value.trim())}>Save change</Button>
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 rounded-[8px] border border-[--color-border] bg-[--color-background] px-4 py-3">
            <span className="text-[12px] leading-4 text-[--color-text-secondary]">BuildBridge read</span>
            <span className="break-words font-mono text-[22px] leading-8 text-[--color-text-primary]">{item.value || '—'}</span>
          </div>
          <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">{WHY[item.provenance]}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={onConfirm} className="ring-2 ring-[--color-primary] ring-offset-2">Confirm</Button>
            <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => setIsEditing(true)}>Modify</Button>
            <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={onReject}>Reject</Button>
            <button type="button" disabled={disabled} onClick={onSkip} className="px-2 text-[14px] leading-5 text-[--color-text-secondary] hover:text-[--color-text-primary]">Skip</button>
          </div>
        </>
      )}
    </div>
  );
}

function DetectedBatch({ items, disabled, onConfirm, onOneByOne }: {
  items: GuidedItem[]; disabled: boolean;
  onConfirm: (ticked: GuidedItem[], unticked: GuidedItem[]) => void; onOneByOne: () => void;
}) {
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const ticked = useMemo(() => items.filter((item) => !unticked.has(item.key)), [items, unticked]);
  const toggle = (key: string) => setUnticked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && ticked.length > 0 && !disabled) {
        onConfirm(ticked, items.filter((item) => unticked.has(item.key)));
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [disabled, items, onConfirm, ticked, unticked]);

  return (
    <div className="flex flex-col gap-3">
      <StepLabel>Detected · {items.length} {items.length === 1 ? 'value' : 'values'}</StepLabel>
      <h3 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">Read directly from the design</h3>
      <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">
        These were measured from the screens, so they’re usually right. Untick anything that looks wrong and it goes back into your queue.
      </p>
      <ul className="m-0 list-none overflow-hidden rounded-[8px] border border-[--color-border] p-0">
        {items.map((item, index) => {
          const isTicked = !unticked.has(item.key);
          return (
            <li key={item.key} className={cn(index < items.length - 1 && 'border-b border-[--color-border]')}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-[14px] leading-5">
                <input type="checkbox" checked={isTicked} onChange={() => toggle(item.key)} className="h-4 w-4 accent-[--color-primary]" />
                <span className={cn('min-w-0 flex-1 truncate', isTicked ? 'text-[--color-text-body]' : 'text-[--color-text-secondary]')}>{item.title}</span>
                <span className="max-w-[45%] truncate font-mono text-[13px] leading-[18px] text-[--color-text-primary]">{item.value}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={disabled || ticked.length === 0} onClick={() => onConfirm(ticked, items.filter((item) => unticked.has(item.key)))}>
          Confirm {ticked.length} {ticked.length === 1 ? 'value' : 'values'}
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={onOneByOne}>Review one by one</Button>
      </div>
      {unticked.size > 0 && (
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">
          {unticked.size} unticked {unticked.size === 1 ? 'value moves' : 'values move'} back to your queue.
        </span>
      )}
    </div>
  );
}

function FinishStep({ tally, skipped, isBlocked, isExample, shareButton, onReviewSkipped }: {
  tally: Tally; skipped: GuidedItem[]; isBlocked: boolean; isExample: boolean; shareButton: ReactNode; onReviewSkipped: () => void;
}) {
  const rows: [string, ReactNode][] = [
    ['Confirmed', tally.confirmed],
    ['Modified', tally.modified],
    ['Rejected', tally.rejected],
    ['Gaps answered', tally.answered],
    ['Skipped', skipped.length > 0 ? `${skipped.length} · ${skipped[0]?.title}${skipped.length > 1 ? ' and more' : ''}` : 0],
  ];
  const skippedGap = skipped.find((item) => item.group === 'Gaps');

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">
        {isExample ? 'That’s the whole loop' : isBlocked ? 'Review finished' : 'This handoff is ready to share'}
      </h3>
      <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">
        {/* Figma's copy lists what the designer did; this version stays true whatever they chose. */}
        {isExample
          ? 'That’s a full review. On your own handoffs, Share handoff sends exactly what the developer view shows, and anything you skipped stays marked as not decided.'
          : isBlocked
            ? 'A critical gap is still open, so the handoff can’t be shared yet. Anything you skipped stays marked as not decided.'
            : 'Developers will see your decisions, and anything you skipped stays marked as not decided.'}
      </p>
      <dl className="m-0 overflow-hidden rounded-[8px] border border-[--color-border]">
        {rows.map(([label, value], index) => (
          <div key={label} className={cn('flex justify-between gap-4 px-4 py-3 text-[14px] leading-5', index < rows.length - 1 && 'border-b border-[--color-border]')}>
            <dt className="text-[--color-text-secondary]">{label}</dt>
            <dd className="m-0 truncate text-right font-medium text-[--color-text-primary]">{value}</dd>
          </div>
        ))}
      </dl>
      <div className={cn('flex gap-2', isExample ? 'flex-col' : 'flex-wrap')}>
        {/* The example's button is a preview, not a share, so it shows even when blocked. */}
        {(isExample || !isBlocked) && shareButton}
        {isExample && (
          <Link href="/handoffs" className={buttonVariants({ variant: 'secondary' })}>
            Start your own handoff
          </Link>
        )}
        {skipped.length > 0 && (
          <Button type="button" variant="secondary" onClick={onReviewSkipped}>
            {skippedGap && skipped.length === 1 ? 'Answer the skipped gap' : 'Review what you skipped'}
          </Button>
        )}
      </div>
    </div>
  );
}
