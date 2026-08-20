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
};

/**
 * Vertical sidebar equivalent of the dashboard's earlier horizontal
 * NavLink — same active-path matching logic, restyled for a left-rail
 * layout (icon + label, full-width row, filled pill on the active item)
 * matching the reference dashboards' sidebar pattern.
 */
export function SidebarNavLink({ href, icon, children }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/handoffs' ? pathname.startsWith('/handoffs') : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[--radius-md] px-3 py-2 text-[length:var(--font-desktop-body-small-medium-size)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
        isActive
          ? 'bg-[--color-primary-light] text-[--color-primary-dark]'
          : 'text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary]',
      )}
    >
      <span className={isActive ? 'text-[--color-primary-dark]' : 'text-[--color-text-muted]'}>{icon}</span>
      {children}
    </Link>
  );
}
