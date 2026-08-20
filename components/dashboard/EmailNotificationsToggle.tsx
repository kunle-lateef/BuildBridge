'use client';

import { useState, useTransition } from 'react';

type EmailNotificationsToggleProps = {
  initialEnabled: boolean;
  action: (enabled: boolean) => Promise<{ ok: boolean }>;
};

export function EmailNotificationsToggle({ initialEnabled, action }: EmailNotificationsToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setEnabled(next); // optimistic — reverted below if the action fails
    startTransition(async () => {
      const result = await action(next);
      if (!result.ok) {
        setEnabled(!next);
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-[--color-text-body]">
      <input
        type="checkbox"
        checked={enabled}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.checked)}
        className="h-4 w-4 rounded-[--radius-sm] border-[--color-border] accent-[--color-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
      />
      Email me when an analysis finishes or a developer flags something
    </label>
  );
}
