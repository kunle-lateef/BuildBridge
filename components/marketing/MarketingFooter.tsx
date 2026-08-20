import Link from 'next/link';

import { BrandMark } from '@/components/ui/BrandMark';

// Two honest columns, not a padded four/five-column sitemap — every link
// here goes to a page or in-page section that actually exists. See
// reference-inspiration.md's marketing pages note.
const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/#who-its-for', label: 'Who it’s for' },
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/#trust', label: 'Why trust it' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/sign-in', label: 'Sign in' },
      { href: '/sign-up', label: 'Sign up' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[--color-border]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <BrandMark alt="BuildBridge" size={48} mobileSize={32} />
            <p className="text-[--color-text-secondary]">
              Every handoff shows what&rsquo;s confirmed, what&rsquo;s inferred, and what&rsquo;s only a guess.
            </p>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="text-[length:var(--font-desktop-overline-semi-bold-size)] font-semibold uppercase tracking-[1.5px] text-[--color-text-muted]">
                  {column.title}
                </span>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[--color-text-secondary] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[--color-border] pt-6">
          <span className="text-[--color-text-secondary]">© {new Date().getFullYear()} BuildBridge</span>
        </div>
      </div>
    </footer>
  );
}
