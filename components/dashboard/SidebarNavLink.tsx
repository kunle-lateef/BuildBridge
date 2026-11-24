'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type SidebarNavLinkProps = {
  href: string;
  /**
   * A pre-rendered icon element, not a component reference — Sidebar.tsx
   * (a Server Component) can't pass a component type across the server/
   * client boundary (only serializable data and already-rendered JSX
   * survive that boundary), so it renders the icon itself and hands this
   * client component the finished element.
   */
  icon: ReactNode;
  children: string;
  count?: number;
};

/**
 * Vertical sidebar equivalent of the dashboard's earlier horizontal
 * NavLink — same active-path matching logic, restyled for a left-rail
 * layout (icon + label, full-width row, filled pill on the active item)
 * matching the reference dashboards' sidebar pattern.
 */
/**
 * The label beside an icon in the narrow sidebar rail, on hover or keyboard
 * focus. Put it inside a `group relative` element. Hidden from screen
 * readers: the element already carries the label.
 */
export function RailTooltip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-[6px] bg-[--color-text-primary] px-2 py-1 text-[12px] font-medium leading-4 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:max-[1439px]:block"
    >
      {children}
    </span>
  );
}

export function SidebarNavLink({ href, icon, children, count }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/handoffs' ? pathname.startsWith('/handoffs') : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-3 rounded-[--radius-md] px-3 text-[14px] leading-5 transition-colors',
        // Icon rail below 1440 (Figma "Review — 1280 laptop"): 40×36, icon only.
        'lg:max-[1439px]:w-10 lg:max-[1439px]:justify-center lg:max-[1439px]:px-0',
        isActive
          ? 'bg-[--color-surface] font-medium text-[--color-text-primary]'
          : 'text-[--color-text-secondary] hover:bg-[--color-background] hover:text-[--color-text-primary]',
      )}
    >
      <span className={isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-secondary]'}>{icon}</span>
      <span className="flex-1 lg:max-[1439px]:sr-only">{children}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[12px] font-normal leading-4 text-[--color-text-secondary] lg:max-[1439px]:hidden">{count}</span>
      )}
      <RailTooltip>{children}</RailTooltip>
    </Link>
  );
}
