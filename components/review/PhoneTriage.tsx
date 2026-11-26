'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { emailReviewLink, recordDesignerDecision, replyToDeveloperFlag, updateDeveloperFlagStatus } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ChevronRight, Flag } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import type { Region } from '@/lib/geometry';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { IssueSeverity, ProvenanceType } from '@/lib/types';

export type TriageGap = {
  kind: 'gap';
  id: string;
  severity: IssueSeverity;
  provenance: ProvenanceType;
  title: string;
  description: string;
  recommendation: string | null;
  /** "Checkout · Pay button" */
  where: string | null;
  /** What answering it does to readiness: lifts the block, adds points, or nothing. */
  impact: 'ready' | number | null;
  /** The screen around the gap's component, when it has one. */
  crop: { imageUrl: string; region: Region; name: string } | null;
};

export type TriageFlag = {
  kind: 'flag';
  id: string;
  flagKind: 'Mismatch' | 'Question';
  message: string;
  from: string | null;
  createdAt: string;
  /** "Order summary · Responsive": what the flag is about, when it's anchored. */
  about: string | null;
  /** "What the handoff says now", when there's something to show. */
  saysNow: string | null;
  /** An open gap on the same thing, which the reply can also answer. */
  relatedGap: { id: string; title: string } | null;
};

export type TriageItem = TriageGap | TriageFlag;

type PhoneTriageProps = {
  handoffId: string;
  name: string;
  /** The ⋯ actions menu for the top bar. */
  menu: ReactNode;
  readinessScore: number | null;
  criticalOpenCount: number;
  reviewedCount: number;
  findingCount: number;
  items: TriageItem[];
  valuesLeft: number;
  /** Share (or the example's preview) as the secondary and the primary button. */
  shareSecondary: ReactNode;
  sharePrimary: ReactNode;
};

/**
 * Phone triage (Figma `04 — Handoff` → "Phone triage — 0…3"). On phones
 * the Review tab opens on what needs the designer: open gaps, then open
 * developer flags, answered one at a time. Every choice goes through the
 * same actions as desktop (a gap answer is an Override decision, "Not a
 * gap" a Reject, a reply resolves the flag), so nothing here is phone-only
 * state. Values aren't reviewed on phones: a card offers to email a link.
 */
export function PhoneTriage(props: PhoneTriageProps) {
  const { handoffId, name, menu, items, valuesLeft } = props;
  const router = useRouter();
  // The queue is captured when the flow starts, so answered items keep their
  // place while the page refreshes underneath.
  const [queue, setQueue] = useState<TriageItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [handled, setHandled] = useState({ gaps: 0, flags: 0, skipped: 0 });

  function start(fromIndex = 0) {
    setQueue(items);
    setIndex(fromIndex);
    setHandled({ gaps: 0, flags: 0, skipped: 0 });
  }

  function next(outcome: 'gap' | 'flag' | 'skip') {
    setHandled((prev) => ({
      gaps: prev.gaps + (outcome === 'gap' ? 1 : 0),
      flags: prev.flags + (outcome === 'flag' ? 1 : 0),
      skipped: prev.skipped + (outcome === 'skip' ? 1 : 0),
    }));
    if (outcome !== 'skip') router.refresh();
    setIndex((value) => value + 1);
    window.scrollTo({ top: 0 });
  }

  const current = queue?.[index];

  if (queue && current) {
    return (
      <TriageStep
        key={current.id}
        item={current}
        position={index + 1}
        total={queue.length}
        onBack={() => setQueue(null)}
        onDone={next}
      />
    );
  }

  const isCaughtUp = Boolean(queue) || items.length === 0;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <TopBar
        left={
          <Link href="/handoffs" aria-label="Back to handoffs" className={iconButton}>
            <ArrowLeft aria-hidden="true" size={20} />
          </Link>
        }
        title={name}
        right={<span className="flex h-11 w-11 items-center justify-center">{menu}</span>}
      />

      <StateCard {...props} />

      {isCaughtUp ? (
        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-[26px] font-semibold leading-[34px] tracking-[-0.5px] text-[--color-text-primary]">
            {items.length === 0 ? 'You’re all caught up' : 'Done for now'}
          </h2>
          <p className="m-0 text-[16px] leading-6 text-[--color-text-body]">
            {caughtUpLine(handled, items.length)}
          </p>
          {items.length > 0 && (
            <Button variant="secondary" onClick={() => start()}>
              Go through the {items.length} left
            </Button>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 flex items-baseline gap-2 text-[16px] font-semibold leading-6 text-[--color-text-primary]">
            Needs you <span className="text-[14px] font-normal text-[--color-text-secondary]">{items.length}</span>
          </h2>
          <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-[--color-border] bg-white p-0">
            {items.map((item, itemIndex) => (
              <li key={item.id} className={cn(itemIndex > 0 && 'border-t border-[--color-border]')}>
                <button
                  type="button"
                  onClick={() => start(itemIndex)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[--color-background]"
                >
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                    {item.kind === 'gap' ? <SeverityBadge severity={item.severity} /> : <FlagChip kind={item.flagKind} />}
                    <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
                      {item.kind === 'gap' ? item.title : item.message}
                    </span>
                    <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
                      {item.kind === 'gap'
                        ? ['Gap', item.where].filter(Boolean).join(' · ')
                        : `From ${item.from ?? 'a developer'} · ${formatRelativeTime(item.createdAt)}`}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-[--color-text-secondary]" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {valuesLeft > 0 && <ValuesCard handoffId={handoffId} valuesLeft={valuesLeft} isDone={isCaughtUp} />}

      {/* Not in Figma: the full Review (canvas and findings) stays one tap away. */}
      <Link href={`/handoffs/${handoffId}?view=all`} className="text-center text-[14px] font-medium leading-5 text-[--color-primary] underline">
        See everything
      </Link>

      <StickyBar>
        {isCaughtUp ? (
          <span className="flex-1 [&>*]:w-full">{props.sharePrimary}</span>
        ) : (
          <>
            <Button size="lg" className="flex-1" onClick={() => start()}>
              Start with the {items[0]?.kind === 'gap' ? 'gap' : 'flag'}
            </Button>
            {props.shareSecondary}
          </>
        )}
      </StickyBar>
    </div>
  );
}

function caughtUpLine(handled: { gaps: number; flags: number; skipped: number }, left: number): string {
  const parts = [
    handled.gaps > 0 && `${handled.gaps} ${handled.gaps === 1 ? 'gap' : 'gaps'}`,
    handled.flags > 0 && `${handled.flags} developer ${handled.flags === 1 ? 'flag' : 'flags'}`,
  ].filter(Boolean);
  const done = parts.length > 0 ? `${parts.join(' and ')} handled. Developers see your answers on the link straight away.` : '';
  if (left === 0) return done || 'No open gaps or developer flags. Developers see your answers on the link straight away.';
  return `${done} ${left} still ${left === 1 ? 'needs' : 'need'} you.`.trim();
}

const iconButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[--radius-md] text-[--color-text-primary] hover:bg-[--color-surface]';

/** Replaces the app's phone top bar (globals.css, [data-phone-topbar]). */
function TopBar({ left, title, right }: { left: ReactNode; title: ReactNode; right: ReactNode }) {
  return (
    <div data-phone-topbar className="sticky top-0 z-20 -mx-4 -mt-6 flex items-center gap-1 border-b border-[--color-border] bg-white px-1 py-2">
      {left}
      <span className="min-w-0 flex-1 truncate text-[16px] font-medium leading-6 text-[--color-text-primary]">{title}</span>
      {right}
    </div>
  );
}

function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-[--color-border] bg-white px-4 py-3">{children}</div>
  );
}

function StateCard({ readinessScore, criticalOpenCount, reviewedCount, findingCount }: PhoneTriageProps) {
  const isReady = readinessScore !== null && criticalOpenCount === 0;
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-[--color-border] bg-white px-4 py-4">
      <span className="text-[16px] font-semibold leading-6 text-[--color-text-primary]">{isReady ? 'Ready to share' : 'Not ready'}</span>
      {!isReady && criticalOpenCount > 0 && (
        <span className="text-[14px] font-medium leading-5 text-[--color-error]">
          {criticalOpenCount} critical {criticalOpenCount === 1 ? 'gap blocks' : 'gaps block'} sharing
        </span>
      )}
      <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
        {[isReady && 'Nothing blocks sharing', readinessScore !== null && `${readinessScore}% readiness`, `${reviewedCount} of ${findingCount} reviewed`]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </div>
  );
}

function ValuesCard({ handoffId, valuesLeft, isDone }: { handoffId: string; valuesLeft: number; isDone: boolean }) {
  const { toast } = useToast();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function send() {
    setState('sending');
    const result = await emailReviewLink({ handoffId });
    if (result.ok) {
      setState('sent');
      toast('Link sent to your email');
    } else {
      setState('idle');
      toast(result.error.message, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-[12px] bg-[--color-surface] px-4 py-4">
      <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
        {valuesLeft} {valuesLeft === 1 ? 'value' : 'values'} {isDone ? 'still to review' : 'to review'}
      </span>
      <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
        {isDone
          ? 'They stay marked as not decided on the share link until you confirm them.'
          : 'Confirming values is easier with the screen beside you. Pick this up on a computer.'}
      </span>
      <button
        type="button"
        onClick={() => void send()}
        disabled={state !== 'idle'}
        className="mt-1 w-fit text-[12px] font-medium leading-4 text-[--color-primary] underline disabled:text-[--color-text-secondary] disabled:no-underline"
      >
        {state === 'sent' ? 'Sent. Check your email' : state === 'sending' ? 'Sending…' : 'Email me a link'}
      </button>
    </div>
  );
}

function FlagChip({ kind }: { kind: 'Mismatch' | 'Question' }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-[4px] bg-[--color-surface] px-2 text-[12px] font-medium leading-4 tracking-[0.2px] text-[--color-text-secondary]">
      <Flag aria-hidden="true" size={12} />
      {kind}
    </span>
  );
}

function TriageStep({ item, position, total, onBack, onDone }: {
  item: TriageItem;
  position: number;
  total: number;
  onBack: () => void;
  onDone: (outcome: 'gap' | 'flag' | 'skip') => void;
}) {
  return (
    <div className="flex flex-col gap-4 pb-24">
      <TopBar
        left={
          <button type="button" onClick={onBack} aria-label="Back to what needs you" className={iconButton}>
            <ArrowLeft aria-hidden="true" size={20} />
          </button>
        }
        title={`${position} of ${total}`}
        right={
          <button type="button" onClick={() => onDone('skip')} className="h-11 px-3 text-[14px] leading-5 text-[--color-text-secondary]">
            Skip
          </button>
        }
      />
      {item.kind === 'gap' ? (
        <GapStep gap={item} onDone={onDone} />
      ) : (
        <FlagStep flag={item} onDone={onDone} />
      )}
    </div>
  );
}

function GapStep({ gap, onDone }: { gap: TriageGap; onDone: (outcome: 'gap') => void }) {
  const { toast } = useToast();
  const [answer, setAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: 'Override' | 'Reject') {
    setIsSaving(true);
    setError(null);
    const result = await recordDesignerDecision({
      findingType: 'HandoffIssue',
      findingReference: gap.id,
      action,
      newValue: action === 'Override' ? answer.trim() : undefined,
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast(action === 'Override' ? 'Answer saved' : 'Marked as not a gap');
    onDone('gap');
  }

  return (
    <>
      {gap.crop && <ScreenCrop {...gap.crop} />}
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={gap.severity} />
        <ProvenanceBadge provenance={gap.provenance} />
      </div>
      <h1 className="m-0 text-[26px] font-semibold leading-[34px] tracking-[-0.5px] text-[--color-text-primary]">{gap.title}</h1>
      <p className="m-0 text-[16px] leading-6 text-[--color-text-body]">{gap.description}</p>
      {gap.recommendation && (
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">Suggested fix: {gap.recommendation}</p>
      )}
      <label className="flex flex-col gap-2">
        <span className="sr-only">Your answer</span>
        <textarea
          rows={3}
          value={answer}
          maxLength={2000}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="What should happen here?"
          className="w-full resize-none rounded-[8px] border border-[--color-border] bg-white px-3 py-3 text-[16px] leading-6 text-[--color-text-body]"
        />
      </label>
      {gap.impact && (
        <p className="m-0 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
          {gap.impact === 'ready' ? 'Answering this makes the handoff ready.' : `Answering this adds about ${gap.impact}% readiness.`}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-[14px] leading-5 text-[--color-error]">
          {error}
        </p>
      )}
      <StickyBar>
        <Button size="lg" className="flex-1" disabled={isSaving || !answer.trim()} onClick={() => void decide('Override')}>
          {isSaving ? 'Saving…' : 'Save answer'}
        </Button>
        <Button size="lg" variant="secondary" disabled={isSaving} onClick={() => void decide('Reject')}>
          Not a gap
        </Button>
      </StickyBar>
    </>
  );
}

function FlagStep({ flag, onDone }: { flag: TriageFlag; onDone: (outcome: 'flag') => void }) {
  const { toast } = useToast();
  const [reply, setReply] = useState('');
  const [alsoAnswerGap, setAlsoAnswerGap] = useState(Boolean(flag.relatedGap));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function replyAndResolve() {
    setIsSaving(true);
    setError(null);
    const result = await replyToDeveloperFlag({ developerFlagId: flag.id, reply: reply.trim() });
    if (!result.ok) {
      setIsSaving(false);
      setError(result.error.message);
      return;
    }
    if (alsoAnswerGap && flag.relatedGap) {
      const answered = await recordDesignerDecision({
        findingType: 'HandoffIssue',
        findingReference: flag.relatedGap.id,
        action: 'Override',
        newValue: reply.trim(),
      });
      if (!answered.ok) toast('Reply sent, but the gap wasn’t answered. Answer it from the gap itself.', 'error');
    }
    setIsSaving(false);
    toast('Reply sent');
    onDone('flag');
  }

  async function acknowledge() {
    setIsSaving(true);
    setError(null);
    const result = await updateDeveloperFlagStatus({ developerFlagId: flag.id, status: 'Acknowledged' });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast('Acknowledged');
    onDone('flag');
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <FlagChip kind={flag.flagKind} />
        {flag.about && <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">{flag.about}</span>}
      </div>
      <blockquote className="m-0 flex flex-col gap-1 rounded-[12px] border border-[--color-border] bg-white px-4 py-3">
        <span className="text-[16px] leading-6 text-[--color-text-primary]">“{flag.message}”</span>
        <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
          {flag.from ?? 'A developer'} · {formatRelativeTime(flag.createdAt)} · on the share link
        </span>
      </blockquote>
      {flag.saysNow && (
        <div className="flex flex-col gap-1 rounded-[8px] bg-[--color-surface] px-4 py-3">
          <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">What the handoff says now</span>
          <span className="text-[14px] leading-5 text-[--color-text-body]">{flag.saysNow}</span>
        </div>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium leading-5 tracking-[0.1px] text-[--color-text-body]">Your reply</span>
        <textarea
          rows={3}
          value={reply}
          maxLength={2000}
          onChange={(event) => setReply(event.target.value)}
          className="w-full resize-none rounded-[8px] border border-[--color-border] bg-white px-3 py-3 text-[16px] leading-6 text-[--color-text-body]"
        />
      </label>
      {flag.relatedGap && (
        <label className="flex items-center gap-2 text-[14px] leading-5 text-[--color-text-body]">
          <input
            type="checkbox"
            checked={alsoAnswerGap}
            onChange={(event) => setAlsoAnswerGap(event.target.checked)}
            className="h-4 w-4 accent-[--color-primary]"
          />
          Also answer “{flag.relatedGap.title}” with this
        </label>
      )}
      {error && (
        <p role="alert" className="m-0 text-[14px] leading-5 text-[--color-error]">
          {error}
        </p>
      )}
      <StickyBar>
        <Button size="lg" className="flex-1" disabled={isSaving || !reply.trim()} onClick={() => void replyAndResolve()}>
          {isSaving ? 'Sending…' : 'Reply and resolve'}
        </Button>
        <Button size="lg" variant="secondary" disabled={isSaving} onClick={() => void acknowledge()}>
          Acknowledge
        </Button>
      </StickyBar>
    </>
  );
}

/**
 * The screen around the gap's component (Figma "Phone triage — 1"): the
 * screen at the card's width, scrolled so the component sits in the middle,
 * with the component outlined.
 */
function ScreenCrop({ imageUrl, region, name }: { imageUrl: string; region: Region; name: string }) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const HEIGHT = 140;
  const WIDTH = 326; // 358 card − 2×16 padding, at 390

  const scale = natural ? WIDTH / natural.width : 0;
  const centerY = (region.y + region.height / 2) * scale;
  const offset = natural ? Math.max(0, Math.min(natural.height * scale - HEIGHT, centerY - HEIGHT / 2)) : 0;

  return (
    <div className="flex justify-center overflow-hidden rounded-[12px] border border-[--color-border] bg-[--color-surface] px-4">
      <div className="relative overflow-hidden" style={{ width: WIDTH, height: HEIGHT }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, natural size needed */}
        <img
          src={imageUrl}
          alt={`${name} screen, around the gap`}
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          className="absolute left-0 max-w-none bg-white"
          style={{ width: WIDTH, top: -offset }}
        />
        {natural && (
          <span
            aria-hidden="true"
            className="absolute rounded-[6px] border-2 border-[--color-primary]"
            style={{
              left: region.x * scale - 3,
              top: region.y * scale - offset - 3,
              width: region.width * scale + 6,
              height: region.height * scale + 6,
            }}
          />
        )}
      </div>
    </div>
  );
}
