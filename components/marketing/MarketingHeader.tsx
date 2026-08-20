'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { BrandMark } from '@/components/ui/BrandMark';
import { buttonVariants } from '@/components/ui/Button';

type MarketingHeaderProps = {
  /** Omits the link back to the page the visitor is already on. */
  activePage?: 'sign-in' | 'sign-up';
};

// Anchors into sections of the landing page, not separate pages — BuildBridge
// doesn't have Pricing/Solutions/Resources pages, and a nav shouldn't link
// somewhere that doesn't exist. See reference-inspiration.md's marketing
// pages note: sparser and honest beats padded and fake.
const NAV_LINKS = [
  { href: '/#who-its-for', label: 'Who it’s for' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#trust', label: 'Why trust it' },
  { href: '/#faq', label: 'FAQ' },
];

export function MarketingHeader({ activePage }: MarketingHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[--color-border] bg-[--color-background]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          onClick={() => setIsMenuOpen(false)}
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          <BrandMark alt="BuildBridge" size={36} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[--color-text-secondary] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {activePage !== 'sign-in' && (
            <Link
              href="/sign-in"
              className="rounded-[--radius-md] px-3 py-2 text-[--color-text-body] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              Sign in
            </Link>
          )}
          {activePage !== 'sign-up' && (
            <Link href="/sign-up" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Sign up
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] sm:hidden"
        >
          {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
      </div>

      {isMenuOpen && (
        <div id="mobile-nav" className="border-t border-[--color-border] px-4 py-4 sm:hidden">
          <nav aria-label="Primary" className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-[--color-text-secondary] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
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
                className="rounded-[--radius-md] px-3 py-2 text-center text-[--color-text-body] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
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
                Sign up
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
