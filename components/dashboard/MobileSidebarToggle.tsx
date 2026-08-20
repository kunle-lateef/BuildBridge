'use client';

import { Menu } from 'lucide-react';

import { useMobileSidebar } from '@/components/dashboard/MobileSidebarProvider';

/** Hamburger trigger for the off-canvas sidebar — hidden at `lg` and up, where the sidebar is always visible. */
export function MobileSidebarToggle() {
  const { toggle } = useMobileSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[--radius-md] text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] lg:hidden"
      aria-label="Open navigation menu"
    >
      <Menu aria-hidden="true" size={20} />
    </button>
  );
}
