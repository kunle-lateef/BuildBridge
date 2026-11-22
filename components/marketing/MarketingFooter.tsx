import Link from 'next/link';

import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { BrandMark } from '@/components/ui/BrandMark';
import { cn } from '@/lib/cn';

// Columns and labels from Figma's footer (`01 — Home` → Footer). Figma's
// "Example handoff" link waits for the /example page (code-phase-plan.md,
// decision 2), so the footer never links somewhere that doesn't exist.
const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/#who-its-for', label: 'Who it’s for' },
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/#trust', label: 'Accuracy' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/sign-up', label: 'Start a handoff' },
      { href: '/sign-in', label: 'Sign in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[--color-border] bg-white">
      <div className={cn(MARKETING_CONTAINER, 'flex flex-col gap-12 pb-10 pt-12')}>
        <div className="flex flex-col items-start gap-10 sm:flex-row sm:justify-between">
          <BrandMark alt="BuildBridge" size={28} />

          <div className="flex flex-wrap gap-x-20 gap-y-8">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="text-[12px] font-semibold uppercase leading-4 tracking-[1.5px] text-[--color-text-secondary]">
                  {column.title}
                </span>
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] leading-5 text-[--color-text-secondary] hover:text-[--color-text-primary]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[--color-border] pt-6">
          <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
            © {new Date().getFullYear()} BuildBridge
          </span>
        </div>
      </div>
    </footer>
  );
}
