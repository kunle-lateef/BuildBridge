'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

type DeveloperFlagFormProps = {
  shareToken: string;
};

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error';

type TrackedFlag = { id: string; trackingToken: string; message: string };
type FlagStatus = { status: string; kind: string; createdAt: string };

function storageKey(shareToken: string): string {
  return `bb-my-flags:${shareToken}`;
}

function loadTrackedFlags(shareToken: string): TrackedFlag[] {
  try {
    const raw = localStorage.getItem(storageKey(shareToken));
    return raw ? (JSON.parse(raw) as TrackedFlag[]) : [];
  } catch {
    return [];
  }
}

/**
 * The one write path an anonymous developer has — see architecture.md's
 * Data Flow section. Plain fetch() to the route handler, not a server
 * action, so this public write surface stays in one auditable file
 * (app/api/share/[token]/flags/route.ts) rather than spreading into the
 * server-action module the authenticated dashboard uses.
 *
 * Submitted flags are tracked client-side only (localStorage, same
 * mechanism as WhatsChangedBanner) — there's no account to persist them
 * against server-side. Each entry's trackingToken is the bearer capability
 * that lets its status be checked via the public tracking route without
 * authentication; see prisma/schema.prisma's DeveloperFlag.trackingTokenHash.
 */
export function DeveloperFlagForm({ shareToken }: DeveloperFlagFormProps) {
  const [kind, setKind] = useState<'Mismatch' | 'Question'>('Mismatch');
  const [message, setMessage] = useState('');
  const [messageTouched, setMessageTouched] = useState(false);
  const [submittedByName, setSubmittedByName] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [trackedFlags, setTrackedFlags] = useState<TrackedFlag[]>([]);

  const messageError = messageTouched && message.trim().length === 0 ? 'Message cannot be empty.' : undefined;

  useEffect(() => {
    setTrackedFlags(loadTrackedFlags(shareToken));
  }, [shareToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState('submitting');
    setError(null);

    try {
      const response = await fetch(`/api/share/${shareToken}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          message,
          submittedByName: submittedByName.trim() || undefined,
        }),
      });

      const result: { ok: boolean; data?: { id: string; trackingToken: string }; error?: { message?: string } } =
        await response.json();

      if (!response.ok || !result.ok || !result.data) {
        setState('error');
        setError(result.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }

      const nextTracked = [
        ...trackedFlags,
        { id: result.data.id, trackingToken: result.data.trackingToken, message },
      ];
      setTrackedFlags(nextTracked);
      try {
        localStorage.setItem(storageKey(shareToken), JSON.stringify(nextTracked));
      } catch {
        // localStorage unavailable — the flag still submitted successfully, it just won't be trackable on return.
      }

      setState('submitted');
      setMessage('');
    } catch {
      setState('error');
      setError('Something went wrong. Please try again.');
    }
  }

  if (state === 'submitted') {
    return (
      <Card className="flex flex-col gap-2 p-4">
        <h2 className="text-[--color-text-primary]">Thanks — the designer will see this.</h2>
        <p className="text-[--color-text-secondary]">
          Your submissions are tracked below on this device, so you can check back on their status.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setState('idle')}>
          Send another
        </Button>
        <TrackedFlagList shareToken={shareToken} flags={trackedFlags} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-[--color-text-primary]">Flag something for the designer</h2>
        <p className="text-[--color-text-secondary]">
          Spotted a mismatch or have a question about this handoff? Send it here — no account needed.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex gap-4">
          <legend className="sr-only">Flag type</legend>
          <label className="flex items-center gap-2 text-[--color-text-body]">
            <input type="radio" name="kind" checked={kind === 'Mismatch'} onChange={() => setKind('Mismatch')} />
            Mismatch
          </label>
          <label className="flex items-center gap-2 text-[--color-text-body]">
            <input type="radio" name="kind" checked={kind === 'Question'} onChange={() => setKind('Question')} />
            Question
          </label>
        </fieldset>
        <Textarea
          id="developer-flag-message"
          label="Message"
          required
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onBlur={() => setMessageTouched(true)}
          error={messageError}
        />
        <Input
          id="developer-flag-name"
          label="Your name (optional)"
          maxLength={100}
          value={submittedByName}
          onChange={(event) => setSubmittedByName(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-[--color-error]">
            {error}
          </p>
        )}
        <Button type="submit" disabled={state === 'submitting' || message.trim().length === 0}>
          {state === 'submitting' ? 'Sending…' : 'Send'}
        </Button>
      </form>

      <TrackedFlagList shareToken={shareToken} flags={trackedFlags} />
    </Card>
  );
}

function TrackedFlagList({ shareToken, flags }: { shareToken: string; flags: TrackedFlag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-[--color-border] pt-3">
      <span className="text-[--color-text-secondary]">Your submissions on this device</span>
      {flags.map((flag) => (
        <TrackedFlagRow key={flag.id} shareToken={shareToken} flag={flag} />
      ))}
    </div>
  );
}

function TrackedFlagRow({ shareToken, flag }: { shareToken: string; flag: TrackedFlag }) {
  const [status, setStatus] = useState<FlagStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function checkStatus() {
    setIsChecking(true);
    try {
      const response = await fetch(`/api/share/${shareToken}/flags/track/${flag.trackingToken}`);
      const result: { ok: boolean; data?: FlagStatus } = await response.json();
      if (result.ok && result.data) {
        setStatus(result.data);
      }
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 truncate text-[--color-text-body]">{flag.message}</span>
      {status ? (
        <span className="text-[--color-text-secondary]">{status.status}</span>
      ) : (
        <Button type="button" variant="ghost" size="sm" disabled={isChecking} onClick={() => void checkStatus()}>
          {isChecking ? 'Checking…' : 'Check status'}
        </Button>
      )}
    </div>
  );
}
