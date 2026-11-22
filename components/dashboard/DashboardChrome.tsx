'use client';

import { useEffect, useState } from 'react';

import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { Search } from '@/components/ui/icons';
import { useModKey } from '@/components/ui/useModKey';

type DashboardChromeProps = {
  handoffs: { id: string; name: string }[];
};

/**
 * The sidebar search box (Figma `03 — Dashboard`). Owns the command
 * palette's open state so the box and the ⌘K shortcut share it.
 */
export function DashboardChrome({ handoffs }: DashboardChromeProps) {
  const [open, setOpen] = useState(false);
  const modKey = useModKey();

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
        aria-label="Search handoffs and pages"
        className="flex h-[38px] w-full items-center gap-2 rounded-[--radius-md] border border-[--color-border] bg-white pl-3 pr-2 text-[--color-text-secondary] hover:border-[--color-text-dismissed]"
      >
        <Search aria-hidden="true" size={15} />
        <span className="flex-1 text-left text-[14px] leading-5">Search</span>
        <kbd className="rounded-[4px] border border-[--color-border] px-1 py-px font-sans text-[12px] leading-4">{modKey === '⌘' ? '⌘K' : `${modKey} K`}</kbd>
      </button>

      <CommandPalette handoffs={handoffs} open={open} onOpenChange={setOpen} />
    </>
  );
}
