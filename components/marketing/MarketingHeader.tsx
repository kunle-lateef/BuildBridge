'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { BrandMark } from '@/components/ui/BrandMark';
import { buttonVariants } from '@/components/ui/Button';
import { Menu, X } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type MarketingHeaderProps = {
  /** Omits the link back to the page the visitor is already on. */
  activePage?: 'sign-in' | 'sign-up' | 'pricing';
};

// Labels and order from Figma's header (the Pricing page frame's version,
// which adds Pricing). Anchors into the home page, plus the Pricing page.
const NAV_LINKS = [
  { href: '/#who-its-for', label: 'Who it’s for' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#trust', label: 'Accuracy' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/pricing', label: 'Pricing' },
];

export function MarketingHeader({ activePage }: MarketingHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[--color-border] bg-white">
      <div className={cn(MARKETING_CONTAINER, 'flex h-[61px] items-center justify-between gap-4 lg:h-[72px]')}>
        <Link
          href="/"
          onClick={() => setIsMenuOpen(false)}
          className="flex items-center"
        >
          <BrandMark alt="BuildBridge" size={28} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 whitespace-nowrap lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={activePage === 'pricing' && link.href === '/pricing' ? 'page' : undefined}
              className="text-[14px] font-medium leading-5 text-[--color-text-secondary] hover:text-[--color-text-primary] aria-[current=page]:text-[--color-text-primary]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 whitespace-nowrap lg:flex">
          {activePage !== 'sign-in' && (
            <Link href="/sign-in" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              Sign in
            </Link>
          )}
          {activePage !== 'sign-up' && (
            <Link href="/sign-up" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Start a handoff
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] text-[--color-text-primary] lg:hidden"
        >
          {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
      </div>

      {isMenuOpen && (
        <div id="mobile-nav" className="border-t border-[--color-border] px-5 py-4 lg:hidden">
          <nav aria-label="Primary" className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={activePage === 'pricing' && link.href === '/pricing' ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
                className="text-[--color-text-secondary] hover:text-[--color-text-primary]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-2 border-t border-[--color-border] pt-4">
            {activePage !== 'sign-in' && (
              <Link
                href="/sign-in"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-[--radius-md] px-3 py-2 text-center text-[--color-text-body] hover:text-[--color-text-primary]"
              >
                Sign in
              </Link>
            )}
            {activePage !== 'sign-up' && (
              <Link
                href="/sign-up"
                onClick={() => setIsMenuOpen(false)}
                className={buttonVariants({ variant: 'primary', size: 'md' })}
              >
                Start a handoff
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
