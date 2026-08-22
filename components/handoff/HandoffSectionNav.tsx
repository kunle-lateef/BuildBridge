'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

type HandoffSectionNavProps = {
  sections: { id: string; label: string }[];
};

/**
 * Sticks to the top of the content column (just under the dashboard
 * header's own sticky bar) so a long handoff — Screens, Components, Issues,
 * Notes, Share, and so on — stays navigable without scrolling past
 * everything to reach a section further down. Only ever lists sections the
 * page actually rendered for this handoff, mirroring the same conditionals
 * the page itself uses.
 *
 * On a narrow viewport this row overflows and scrolls horizontally, but
 * nothing about a plain overflow-x-auto row hints that more tabs exist past
 * the edge — on mobile, "Share" was invisible with zero indication it was
 * reachable by swiping. The edge fades below only render while there's
 * actually more to scroll to in that direction.
 */
export function HandoffSectionNav({ sections }: HandoffSectionNavProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateFades() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    updateFades();
    el.addEventListener('scroll', updateFades);
    window.addEventListener('resize', updateFades);

    return () => {
      el.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, [sections.length]);

  if (sections.length < 2) return null;

  return (
    <div className="sticky top-16 z-10 -mx-6 relative">
      <nav
        ref={scrollRef}
        aria-label="Handoff sections"
        className="flex gap-1 overflow-x-auto border-b border-[--color-border] bg-[--color-background]/95 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-[--color-background]/80"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="shrink-0 rounded-[--radius-sm] px-3 py-1.5 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            {section.label}
          </a>
        ))}
      </nav>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-8 bg-[linear-gradient(to_right,var(--color-background),transparent)] transition-opacity',
          canScrollLeft ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-8 bg-[linear-gradient(to_left,var(--color-background),transparent)] transition-opacity',
          canScrollRight ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
