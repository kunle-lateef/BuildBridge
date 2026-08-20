'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CommandPalette } from '@/components/dashboard/CommandPalette';

type DashboardChromeProps = {
  handoffs: { id: string; name: string }[];
};

/**
 * Owns the command palette's open state so both entry points — the ⌘K
 * shortcut and this visible search trigger in the top bar — share one
 * source of truth. Previously the palette was keyboard-only with no
 * discoverable way to open it; every reference dashboard (Vercel, Framer)
 * surfaces a visible search affordance even though the shortcut still works.
 */
export function DashboardChrome({ handoffs }: DashboardChromeProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Find a handoff or page"
        className="flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-2 text-[--color-text-muted] transition-colors hover:border-[--color-primary] hover:text-[--color-text-secondary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] sm:w-64 sm:justify-start sm:px-3"
      >
        <Search aria-hidden="true" size={15} />
        <span className="hidden flex-1 text-left text-[length:var(--font-desktop-body-small-regular-size)] sm:block">
          Find a handoff or page…
        </span>
        <kbd className="hidden rounded-[--radius-sm] border border-[--color-border] bg-[--color-background] px-1.5 py-0.5 font-mono text-[length:var(--font-desktop-caption-regular-size)] sm:block">
          ⌘K
        </kbd>
      </button>

      <CommandPalette handoffs={handoffs} open={open} onOpenChange={setOpen} />
    </>
  );
}
