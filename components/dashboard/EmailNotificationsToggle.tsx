'use client';

import { useState, useTransition } from 'react';

import { cn } from '@/lib/cn';

type EmailNotificationsToggleProps = {
  initialEnabled: boolean;
  action: (enabled: boolean) => Promise<{ ok: boolean }>;
};

/** Figma `06 — Settings / Notifications`: a card with a switch. */
export function EmailNotificationsToggle({ initialEnabled, action }: EmailNotificationsToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange() {
    const next = !enabled;
    setEnabled(next); // optimistic — reverted below if the action fails
    startTransition(async () => {
      const result = await action(next);
      if (!result.ok) {
        setEnabled(!next);
      }
    });
  }

  return (
    <div className="flex items-center gap-6 rounded-[8px] border border-[--color-border] bg-white px-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span id="email-notifications-label" className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
          Email me about my handoffs
        </span>
        <span id="email-notifications-description" className="text-[14px] leading-5 text-[--color-text-secondary]">
          When an analysis finishes or fails, a developer flags something, or a finding is marked implemented.
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="email-notifications-label"
        aria-describedby="email-notifications-description"
        disabled={isPending}
        onClick={handleChange}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60',
          enabled ? 'bg-[--color-primary]' : 'bg-[--color-text-muted]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
