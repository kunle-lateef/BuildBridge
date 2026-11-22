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
export function SidebarNavLink({ href, icon, children, count }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/handoffs' ? pathname.startsWith('/handoffs') : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-3 rounded-[--radius-md] px-3 text-[14px] leading-5 transition-colors',
        isActive
          ? 'bg-[--color-surface] font-medium text-[--color-text-primary]'
          : 'text-[--color-text-secondary] hover:bg-[--color-background] hover:text-[--color-text-primary]',
      )}
    >
      <span className={isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-secondary]'}>{icon}</span>
      <span className="flex-1">{children}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[12px] font-normal leading-4 text-[--color-text-secondary]">{count}</span>
      )}
    </Link>
  );
}
