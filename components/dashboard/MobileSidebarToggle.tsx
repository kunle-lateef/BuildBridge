'use client';

import { useMobileSidebar } from '@/components/dashboard/MobileSidebarProvider';
import { Menu } from '@/components/ui/icons';


/** Hamburger trigger for the off-canvas sidebar — hidden at `lg` and up, where the sidebar is always visible. */
export function MobileSidebarToggle() {
  const { toggle } = useMobileSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[--radius-md] text-[--color-text-primary] hover:bg-[--color-surface] lg:hidden"
      aria-label="Open navigation menu"
    >
      <Menu aria-hidden="true" size={20} />
    </button>
  );
}
