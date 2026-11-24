'use client';

import { useEffect, useState } from 'react';

import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { RailTooltip } from '@/components/dashboard/SidebarNavLink';
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
        className="group relative flex h-[38px] w-full items-center gap-2 rounded-[--radius-md] border border-[--color-border] bg-white pl-3 pr-2 text-[--color-text-secondary] hover:border-[--color-text-dismissed] lg:max-[1439px]:h-9 lg:max-[1439px]:w-10 lg:max-[1439px]:justify-center lg:max-[1439px]:px-0"
      >
        <Search aria-hidden="true" size={15} />
        <span className="flex-1 text-left text-[14px] leading-5 lg:max-[1439px]:hidden">Search</span>
        <kbd className="rounded-[4px] border border-[--color-border] px-1 py-px font-sans text-[12px] leading-4 lg:max-[1439px]:hidden">{modKey === '⌘' ? '⌘K' : `${modKey} K`}</kbd>
        <RailTooltip>Search {modKey === '⌘' ? '⌘K' : `${modKey} K`}</RailTooltip>
      </button>

      <CommandPalette handoffs={handoffs} open={open} onOpenChange={setOpen} />
    </>
  );
}
