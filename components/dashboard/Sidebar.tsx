'use client';

import { GitCompare, LayoutGrid, LineChart, Settings as SettingsIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useMobileSidebar } from '@/components/dashboard/MobileSidebarProvider';
import { SidebarNavLink } from '@/components/dashboard/SidebarNavLink';
import { BrandMark } from '@/components/ui/BrandMark';
import { cn } from '@/lib/cn';

type SidebarProps = {
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
};

/**
 * Left-rail primary navigation, replacing the earlier horizontal header
 * nav — every reference dashboard in the redesign brief (Vercel, Framer,
 * HoneyBook, Customer.io) uses a sidebar, not a top bar, for this. The top
 * bar (see layout.tsx) keeps only cross-page utilities: search/command
 * palette and notifications.
 *
 * Below `lg`, this becomes an off-canvas drawer (fixed, translated
 * off-screen, backdrop behind it) instead of a permanent 240px column —
 * fixed-width sidebars have no way to shrink, so below roughly 1024px they
 * were eating more width than the content they sit next to. At `lg` and up
 * it's unchanged: sticky, always visible, no backdrop.
 */
export function Sidebar({ userName, userEmail, signOutAction }: SidebarProps) {
  const initial = (userName || userEmail).charAt(0).toUpperCase();
  const { isOpen, close } = useMobileSidebar();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountMenuOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-[--color-border] bg-[--color-background] transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/handoffs" className="flex items-center gap-2">
            <BrandMark alt="BuildBridge" />
          </Link>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-[--radius-md] text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
          <SidebarNavLink href="/handoffs" icon={<LayoutGrid aria-hidden size={18} />}>
            Handoffs
          </SidebarNavLink>
          <SidebarNavLink href="/insights" icon={<LineChart aria-hidden size={18} />}>
            Insights
          </SidebarNavLink>
          <SidebarNavLink href="/drift" icon={<GitCompare aria-hidden size={18} />}>
            Drift
          </SidebarNavLink>
          <SidebarNavLink href="/settings" icon={<SettingsIcon aria-hidden size={18} />}>
            Settings
          </SidebarNavLink>
        </nav>

        <div className="border-t border-[--color-border] p-3" ref={accountMenuRef}>
          {isAccountMenuOpen && (
            <form action={signOutAction}>
              <button
                type="submit"
                className="mb-1 w-full rounded-[--radius-md] px-2 py-1.5 text-left text-[length:var(--font-desktop-body-small-regular-size)] text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
              >
                Sign out
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            aria-expanded={isAccountMenuOpen}
            className="flex w-full items-center gap-2 rounded-[--radius-md] border border-[--color-border] p-2 text-left hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-[length:var(--font-desktop-caption-semi-bold-size)] font-semibold text-white">
              {initial}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className="truncate text-[length:var(--font-desktop-body-small-medium-size)] font-medium text-[--color-text-primary]"
                title={userName}
              >
                {userName}
              </span>
              <span
                className="truncate text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]"
                title={userEmail}
              >
                {userEmail}
              </span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
