'use client';

import { useEffect, useRef, useState } from 'react';

import { Card } from '@/components/ui/Card';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

type TrustCardItem = {
  type: ProvenanceType;
  property: string;
  value: string;
  description: string;
  borderStyle: string;
  tintClass: string;
};

type TrustCardsProps = {
  items: TrustCardItem[];
};

/**
 * A one-shot stagger reveal for the three provenance cards, firing once the
 * grid scrolls into view — same "small client wrapper around otherwise
 * static content" shape as HeroIntro/HowItWorksInteractive. The tint and
 * border style each card carries are its own data (tintClass/borderStyle on
 * PROVENANCE_COPY), not decided here — this component only decides *when*
 * they animate in, never *what* they look like.
 */
export function TrustCards({ items }: TrustCardsProps) {
  const [revealed, setRevealed] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map(({ type, property, value, description, borderStyle, tintClass }, index) => (
        <Card
          key={type}
          style={{ transitionDelay: revealed ? `${index * 110}ms` : '0ms' }}
          className={cn(
            'flex flex-col gap-4 border-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            borderStyle,
            tintClass,
            revealed ? 'translate-y-0 opacity-100' : 'translate-y-3.5 opacity-0',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[--color-text-secondary]">{property}</span>
            <ProvenanceBadge provenance={type} />
          </div>
          <span className="font-mono text-[--color-text-primary]">{value}</span>
          <p className="border-t border-[--color-border] pt-4 text-[--color-text-secondary]">{description}</p>
        </Card>
      ))}
    </div>
  );
}
