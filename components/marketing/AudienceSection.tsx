import type { ReactNode } from 'react';

import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { buttonVariants } from '@/components/ui/Button';
import { Check, Lock } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

type Point = { title: string; description: string };

const DESIGNER_POINTS: Point[] = [
  {
    title: 'Gaps are flagged for you',
    description: 'Missing states and breakpoints are flagged, so you can answer them before handoff.',
  },
  {
    title: 'Every finding needs your decision',
    description: 'Nothing reaches a developer until you confirm, modify or reject it.',
  },
];

const DEVELOPER_POINTS: Point[] = [
  {
    title: 'Everything on one page',
    description: 'Specs, states and edge cases in one read-only view, not spread across chat threads.',
  },
  {
    title: 'Ready means ready',
    description: 'A handoff only shows as ready once every critical gap is answered.',
  },
];

type Row = { property: string; value: string; provenance?: ProvenanceType; note?: string };

const DECIDED: Row[] = [
  { property: 'Corner radius', value: '8px', provenance: 'Detected' },
  { property: 'Fill', value: '#4F46E5', provenance: 'Detected' },
  { property: 'Focus ring', value: '3px primary, offset 2', note: 'Modified by designer' },
];

const NOT_DECIDED: Row[] = [
  { property: 'Hover', value: 'darkens 8%', provenance: 'Inferred' },
  { property: 'Loading', value: 'Spinner only', provenance: 'Suggested' },
];

/**
 * "What designers review, and what developers get" — Figma `01 — Home` →
 * "Who it's for". Both cards follow the same Pay button: the designer
 * corrects its focus ring, and the developer sees that value marked
 * "Modified by designer", with anything undecided kept apart.
 */
export function AudienceSection() {
  return (
    <section id="who-its-for" className="scroll-mt-20">
      <div className={cn(MARKETING_CONTAINER, 'flex flex-col gap-10 py-20')}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,600px)_400px] lg:justify-between lg:gap-20">
          <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.5px] text-[--color-text-primary] sm:text-[36px] sm:leading-[44px]">
            What designers review, and what developers get
          </h2>
          <p className="text-[16px] leading-6 text-[--color-text-secondary] lg:pt-4">
            Designers confirm or correct each finding. Developers get a read-only link: decided specs to build from, and
            anything still open clearly marked.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AudienceCard tray={<DesignerTray />} title="For designers" points={DESIGNER_POINTS} />
          <AudienceCard tray={<DeveloperTray />} title="For developers" points={DEVELOPER_POINTS} />
        </div>
      </div>
    </section>
  );
}

function AudienceCard({ tray, title, points }: { tray: ReactNode; title: string; points: Point[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-[--color-border] bg-white">
      <div className="flex items-center justify-center border-b border-[--color-border] bg-[--color-surface] p-4 sm:p-8 lg:h-[383px]">
        {tray}
      </div>
      <div className="flex flex-col gap-6 px-6 pb-10 pt-8 sm:px-10">
        <h3 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">{title}</h3>
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {points.map((point) => (
            <li key={point.title} className="flex gap-3">
              <Check aria-hidden="true" size={16} className="mt-[3px] shrink-0 text-[--color-primary]" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-medium leading-6 text-[--color-text-primary]">{point.title}</span>
                <span className="text-[14px] leading-5 text-[--color-text-secondary]">{point.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The Modify editor from the Review page, mid-correction. Illustrative and inert. */
function DesignerTray() {
  return (
    <div aria-hidden="true" className="flex w-full flex-col gap-4 rounded-[12px] border border-[--color-border] bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-dashed border-[--color-inferred] bg-white text-[12px] font-medium text-[--color-inferred]">
          2
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">Pay button · focus ring</span>
          <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
            Read as 2px primary, offset 2
          </span>
        </div>
        <ProvenanceBadge provenance="Inferred" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] font-medium leading-5 tracking-[0.1px] text-[--color-text-body]">Your value</span>
        <span className="rounded-[8px] border-[1.5px] border-[--color-primary] bg-white px-3 py-2.5 font-mono text-[13px] leading-[18px] text-[--color-text-primary]">
          3px primary, offset 2
        </span>
      </div>
      <div className="flex gap-2">
        <span className={buttonVariants({ variant: 'primary', size: 'md' })}>Save change</span>
        <span className={buttonVariants({ variant: 'ghost', size: 'md' })}>Cancel</span>
      </div>
    </div>
  );
}

/** The developer's read-only view of the same Pay button. Illustrative and inert. */
function DeveloperTray() {
  return (
    <div aria-hidden="true" className="w-full overflow-hidden rounded-[12px] border border-[--color-border] bg-white">
      <div className="flex items-center gap-3 border-b border-[--color-border] px-4 py-2.5">
        <span className="flex-1 text-[14px] font-medium leading-5 text-[--color-text-primary]">Pay button</span>
        <span className="flex items-center gap-1.5 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
          <Lock size={12} />
          Read-only
        </span>
      </div>
      <GroupLabel label="Decided" count={DECIDED.length} isDecided />
      {DECIDED.map((row) => (
        <DevRow key={row.property} row={row} />
      ))}
      <GroupLabel label="Not decided yet" count={NOT_DECIDED.length} isDecided={false} />
      {NOT_DECIDED.map((row, i) => (
        <DevRow key={row.property} row={row} isMuted isLast={i === NOT_DECIDED.length - 1} />
      ))}
    </div>
  );
}

function GroupLabel({ label, count, isDecided }: { label: string; count: number; isDecided: boolean }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-[--color-border] px-3.5 pb-1.5 pt-3 text-[12px] leading-4 tracking-[0.2px]">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isDecided ? 'bg-[--color-text-body]' : 'border border-[--color-text-muted]',
        )}
      />
      <span className="font-medium text-[--color-text-primary]">{label}</span>
      <span className="text-[--color-text-muted]">{count}</span>
    </div>
  );
}

function DevRow({ row, isMuted = false, isLast = false }: { row: Row; isMuted?: boolean; isLast?: boolean }) {
  return (
    <div
      className={cn(
        'grid grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2.5',
        !isLast && 'border-b border-[--color-border]',
      )}
    >
      <span className={cn('text-[14px] leading-5', isMuted ? 'text-[--color-text-muted]' : 'text-[--color-text-secondary]')}>
        {row.property}
      </span>
      <span
        className={cn(
          'font-mono text-[13px] leading-[18px]',
          isMuted ? 'text-[--color-text-muted]' : 'text-[--color-text-primary]',
        )}
      >
        {row.value}
      </span>
      {row.provenance ? (
        <ProvenanceBadge provenance={row.provenance} />
      ) : (
        <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">{row.note}</span>
      )}
    </div>
  );
}
