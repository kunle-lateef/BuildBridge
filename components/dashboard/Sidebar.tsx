'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useMobileSidebar } from '@/components/dashboard/MobileSidebarProvider';
import { SidebarNavLink } from '@/components/dashboard/SidebarNavLink';
import { BrandMark } from '@/components/ui/BrandMark';
import { ArrowDown, LayoutGrid, LineChart, Settings as SettingsIcon, X } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type SidebarUsage = {
  used: number;
  quota: number;
  planLabel: string;
  /** Projected end-of-cycle use, only passed when it would go over the quota. */
  projectedOver: number | null;
  resetsOn: string;
  activeCount: number;
  activeCap: number;
};

type SidebarProps = {
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
  handoffCount: number;
  usage: SidebarUsage;
  /** The search trigger (opens the ⌘K palette). */
  search: ReactNode;
  /** The notification bell, beside the logo. */
  bell: ReactNode;
};

/**
 * The app sidebar, as in Figma `03 — Dashboard`: logo and bell, search,
 * Handoffs · Insights · Settings, the plan usage card and the account row.
 * Below `lg` it becomes an off-canvas drawer.
 */
export function Sidebar({ userName, userEmail, signOutAction, handoffCount, usage, search, bell }: SidebarProps) {
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

  const usedPercent = usage.quota > 0 ? Math.min(100, Math.round((usage.used / usage.quota) * 100)) : 0;
  const isAtCap = usage.activeCount >= usage.activeCap;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-[rgba(14,19,32,0.4)] lg:hidden" onClick={close} aria-hidden="true" />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-[--color-border] bg-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:translate-x-0',
          // Figma "Review — 1280 laptop": below 1440 the sidebar is a 64px icon rail.
          'lg:max-[1439px]:w-16',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 lg:max-[1439px]:h-auto lg:max-[1439px]:flex-col lg:max-[1439px]:justify-center lg:max-[1439px]:gap-3 lg:max-[1439px]:px-0 lg:max-[1439px]:pb-2 lg:max-[1439px]:pt-4">
          <Link href="/handoffs" className="flex items-center" aria-label="BuildBridge">
            <BrandMark alt="" size={28} className="lg:max-[1439px]:hidden" />
            <Image
              src="/logo/buildbridge-icon.svg"
              alt=""
              width={28}
              height={28}
              unoptimized
              className="hidden lg:max-[1439px]:block"
            />
          </Link>
          <div className="hidden lg:block">{bell}</div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-[--radius-md] text-[--color-text-secondary] hover:bg-[--color-surface] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="px-3 pb-2 lg:max-[1439px]:flex lg:max-[1439px]:justify-center lg:max-[1439px]:px-0">{search}</div>

        <nav aria-label="Primary" className="flex flex-col gap-0.5 px-3 pt-1 lg:max-[1439px]:items-center lg:max-[1439px]:px-0">
          <SidebarNavLink href="/handoffs" icon={<LayoutGrid aria-hidden size={18} />} count={handoffCount}>
            Handoffs
          </SidebarNavLink>
          <SidebarNavLink href="/insights" icon={<LineChart aria-hidden size={18} />}>
            Insights
          </SidebarNavLink>
          <SidebarNavLink href="/settings" icon={<SettingsIcon aria-hidden size={18} />}>
            Settings
          </SidebarNavLink>
        </nav>

        <div className="flex-1" />

        <div className="px-3 pb-3 lg:max-[1439px]:hidden">
          <div className="flex flex-col gap-2 rounded-[8px] border border-[--color-border] p-3 text-[12px] leading-4">
            <div className="flex justify-between text-[--color-text-secondary]">
              <span>Analyses this month</span>
              <span className="font-medium">{usage.planLabel}</span>
            </div>
            <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
              {usage.used} of {usage.quota} used
            </span>
            <span
              className="block h-1 overflow-hidden rounded-full bg-[--color-surface]"
              role="meter"
              aria-label="Analyses used this month"
              aria-valuemin={0}
              aria-valuemax={usage.quota}
              aria-valuenow={usage.used}
            >
              <span className="block h-full rounded-full bg-[--color-warning]" style={{ width: `${usedPercent}%` }} />
            </span>
            {usage.projectedOver !== null && (
              <span className="text-[--color-error]">
                On pace for about {usage.projectedOver}, over your limit. Resets {usage.resetsOn}.
              </span>
            )}
            <span className="h-px bg-[--color-border]" />
            <div className="flex justify-between">
              <span className="text-[--color-text-secondary]">Active handoffs</span>
              <span className="font-medium text-[--color-text-primary]">
                {usage.activeCount} of {usage.activeCap}
              </span>
            </div>
            {isAtCap && <span className="text-[--color-text-secondary]">Archive one to start a new handoff.</span>}
          </div>
        </div>

        <div className="relative border-t border-[--color-border]" ref={accountMenuRef}>
          {isAccountMenuOpen && (
            <form action={signOutAction} className="absolute bottom-full left-3 right-3 mb-1 lg:max-[1439px]:right-auto lg:max-[1439px]:w-40">
              <button
                type="submit"
                className="w-full rounded-[--radius-md] border border-[--color-border] bg-white px-3 py-2 text-left text-[14px] leading-5 text-[--color-text-body] shadow-lg hover:bg-[--color-surface]"
              >
                Sign out
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            aria-expanded={isAccountMenuOpen}
            aria-label="Account menu"
            title={`${userName}\n${userEmail}`}
            className="flex w-full items-center gap-3 py-4 pl-6 pr-4 text-left hover:bg-[--color-background] lg:max-[1439px]:justify-center lg:max-[1439px]:px-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[--color-primary-light] text-[12px] font-medium leading-4 text-[--color-primary-dark]">
              {initial}
            </span>
            <span className="flex min-w-0 flex-1 flex-col lg:max-[1439px]:hidden">
              <span className="truncate text-[14px] font-medium leading-5 text-[--color-text-primary]" title={userName}>
                {userName}
              </span>
              <span className="truncate text-[12px] leading-4 text-[--color-text-secondary]" title={userEmail}>
                {userEmail}
              </span>
            </span>
            <ArrowDown aria-hidden="true" size={16} className="shrink-0 text-[--color-text-secondary] lg:max-[1439px]:hidden" />
          </button>
        </div>
      </aside>
    </>
  );
}
