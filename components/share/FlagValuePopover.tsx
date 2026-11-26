'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { submitFlag } from '@/components/handoff/DeveloperFlagForm';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, X } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type FlagKind = 'Mismatch' | 'Question';

const KINDS: { kind: FlagKind; title: string; hint: string }[] = [
  { kind: 'Mismatch', title: 'Mismatch', hint: 'My build doesn’t match this' },
  { kind: 'Question', title: 'Question', hint: 'Something isn’t clear' },
];

const POPOVER_WIDTH = 380;
const GAP = 8;

type FlagValuePopoverProps = {
  shareToken: string;
  /** "Pay button · Hover" */
  label: string;
  value: string;
  isMono: boolean;
  findingType: string;
  findingReference: string;
  /** The ⋯ button it opened from; the desktop popover sits under it. */
  anchor: DOMRect;
  onClose: () => void;
};

/**
 * "Flag this value" (Figma `05 — Share view` → "Flag a value", "Flag sent",
 * "Flag a value · Mobile 390"): a popover by the value on desktop, a bottom
 * sheet on phones. The flag goes through the same public route as the form
 * at the end of the page, anchored to this value, and joins "Your flags".
 */
export function FlagValuePopover({ shareToken, label, value, isMono, findingType, findingReference, anchor, onClose }: FlagValuePopoverProps) {
  const [kind, setKind] = useState<FlagKind>('Mismatch');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentKind, setSentKind] = useState<FlagKind | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    messageRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function send() {
    if (!message.trim()) return;
    setIsSending(true);
    setError(null);
    const failure = await submitFlag(shareToken, {
      kind,
      message: message.trim(),
      submittedByName: name.trim() || undefined,
      findingType,
      findingReference,
    });
    setIsSending(false);
    if (failure) setError(failure);
    else setSentKind(kind);
  }

  // Desktop: under the ⋯, right edges lined up, kept on screen.
  const top = Math.max(16, Math.min(anchor.bottom + GAP, window.innerHeight - (sentKind ? 240 : 520)));
  const left = Math.max(16, Math.min(anchor.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 16));

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-[rgba(14,19,32,0.4)] sm:bg-transparent" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ '--flag-top': `${top}px`, '--flag-left': `${left}px` } as React.CSSProperties}
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-white p-4 text-left',
          'inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[16px] shadow-lg',
          'sm:bottom-auto sm:left-[var(--flag-left)] sm:right-auto sm:top-[var(--flag-top)] sm:max-h-none sm:w-[380px] sm:rounded-[12px] sm:border sm:border-[--color-border] sm:shadow-[0_12px_32px_-6px_rgba(10,15,26,0.14)]',
        )}
      >
        {sentKind ? (
          <div className="flex flex-col gap-3">
            <span className="flex w-fit rounded-full bg-[--color-success-light] p-2 text-[--color-success]">
              <CheckCircle2 aria-hidden="true" size={20} />
            </span>
            <h2 id={titleId} className="m-0 text-[16px] font-medium leading-6 text-[--color-text-primary]">
              Sent. The designer will see it.
            </h2>
            <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
              Your {sentKind === 'Mismatch' ? 'mismatch' : 'question'} on {label} is under Your flags. When the designer acknowledges or
              resolves it, the status changes there.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  onClose();
                  document.getElementById('flag')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                Flag something else
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 id={titleId} className="m-0 text-[16px] font-medium leading-6 text-[--color-text-primary]">
                Flag this value
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-[6px] text-[--color-text-secondary] hover:bg-[--color-surface]"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <p className="m-0 flex flex-wrap items-center gap-2 rounded-[8px] bg-[--color-background] px-3 py-2">
              <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">{label}</span>
              <span className={cn('text-[--color-text-primary]', isMono ? 'font-mono text-[13px] leading-[18px]' : 'text-[14px] leading-5')}>
                {value || '—'}
              </span>
            </p>

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 p-0 text-[14px] font-medium leading-5 tracking-[0.1px] text-[--color-text-body]">What kind of flag?</legend>
              <div role="radiogroup" className="flex gap-0.5 rounded-[8px] bg-[--color-surface] p-0.5">
                {KINDS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    role="radio"
                    aria-checked={kind === option.kind}
                    onClick={() => setKind(option.kind)}
                    className={cn(
                      'flex min-w-0 flex-1 flex-col items-start gap-px rounded-[4px] border px-3 py-2 text-left',
                      kind === option.kind
                        ? 'border-[--color-border] bg-white text-[--color-text-primary]'
                        : 'border-transparent text-[--color-text-secondary]',
                    )}
                  >
                    <span className="text-[14px] font-medium leading-5 tracking-[0.1px]">{option.title}</span>
                    <span className="truncate text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">{option.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-2">
              <span className="text-[14px] font-medium leading-5 tracking-[0.1px] text-[--color-text-body]">Message</span>
              <textarea
                ref={messageRef}
                rows={3}
                maxLength={2000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void send();
                }}
                className="w-full resize-none rounded-[8px] border border-[--color-border] px-3 py-3 text-[14px] leading-5 text-[--color-text-body]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[14px] font-medium leading-5 tracking-[0.1px] text-[--color-text-body]">Your name (optional)</span>
              <input
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-[8px] border border-[--color-border] px-3 py-2 text-[14px] leading-5 text-[--color-text-body]"
              />
            </label>

            {error && (
              <p role="alert" className="m-0 text-[14px] leading-5 text-[--color-error]">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <span className="flex-1 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
                The designer sees which value this is about.
              </span>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => void send()} disabled={isSending || !message.trim()}>
                {isSending ? 'Sending…' : 'Send flag'}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
