'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { READINESS_CATEGORY_LABEL, SEVERITY_ORDER } from '@/lib/readinessLabels';
import type { IssueSeverity, ReadinessCategory } from '@/lib/types';

export type BreakdownCategory = {
  category: ReadinessCategory;
  score: number;
  openGaps: Partial<Record<IssueSeverity, number>>;
  deducted: number;
};

export type BreakdownData = {
  version: number;
  overall: number;
  exactAverage: number;
  hasUnresolvedCritical: boolean;
  categories: BreakdownCategory[];
  /** Points each open gap takes off, from lib/readiness.ts (the formula itself). */
  deductions: Record<IssueSeverity, number>;
};

type ReadinessBreakdownProps = {
  data: BreakdownData;
  /** The readiness line it explains; becomes the button that opens it. */
  children: ReactNode;
};

function gapsLine({ openGaps, deducted }: BreakdownCategory, deductions: Record<IssueSeverity, number>): string {
  const parts = SEVERITY_ORDER.filter((severity) => openGaps[severity]).map(
    (severity) => `${openGaps[severity]} ${severity === 'Recommendation' ? 'recommendation' : severity.toLowerCase()}`,
  );
  if (parts.length === 0) return 'No open gaps';
  const total = SEVERITY_ORDER.reduce((sum, severity) => sum + (openGaps[severity] ?? 0), 0);
  const noun = total === 1 && !openGaps.Recommendation ? 'gap' : 'gaps';
  // Gaps can add up to more than 100; a category stops at 0, so say so
  // rather than show a sum that looks wrong.
  const raw = SEVERITY_ORDER.reduce((sum, severity) => sum + (openGaps[severity] ?? 0) * deductions[severity], 0);
  const points = deducted > 0 ? `  −${deducted}${raw > deducted ? ` (stops at 0)` : ''}` : '';
  return `${parts.join(', ')} ${noun}${points}`;
}

function formatAverage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * "How 78% is worked out" (Figma `04 — Handoff / Readiness breakdown`):
 * a panel under the readiness line on desktop, a bottom sheet on phones.
 * Everything in it comes from lib/readiness.ts's explainReadiness and the
 * formula's own deduction table, so it can't drift from the score.
 */
export function ReadinessBreakdown({ data, children }: ReadinessBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    function onDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [isOpen]);

  const rates = SEVERITY_ORDER.filter((severity) => data.deductions[severity] > 0)
    .map((severity) => `${severity.toLowerCase()} ${data.deductions[severity]}`)
    .join(', ');

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-[4px] text-left hover:text-[--color-text-primary] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary]"
      >
        {children}
      </button>

      {isOpen && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-[--color-text-primary] opacity-40 sm:hidden" onClick={() => setIsOpen(false)} />
          <section
            id={panelId}
            aria-label={`How ${data.overall}% is worked out`}
            className={cn(
              'z-50 flex flex-col bg-white shadow-lg',
              'fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[16px]',
              'sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[380px] sm:rounded-[12px] sm:border sm:border-[--color-border]',
            )}
          >
            <div className="flex flex-col gap-1 border-b border-[--color-border] px-4 py-4">
              <h2 className="m-0 text-[14px] font-medium leading-5 text-[--color-text-primary]">How {data.overall}% is worked out</h2>
              <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
                Each category starts at 100. Every open gap takes points off: {rates}. The score is the average of the six.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-4 border-b border-[--color-border] p-4">
              {data.categories.map((row) => (
                <li key={row.category} className="flex items-center gap-4">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[14px] leading-5 text-[--color-text-primary]">{READINESS_CATEGORY_LABEL[row.category]}</span>
                    <span className="whitespace-pre text-[12px] leading-4 text-[--color-text-secondary]">{gapsLine(row, data.deductions)}</span>
                  </span>
                  <span aria-hidden="true" className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-[--color-surface]">
                    <span
                      className={cn('block h-full rounded-full', row.score === 100 ? 'bg-[--color-text-primary]' : 'bg-[--color-text-body]')}
                      style={{ width: `${row.score}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-[14px] font-medium leading-5 text-[--color-text-primary]">{row.score}%</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 px-4 py-3 text-[12px] leading-4">
              <p className="m-0 text-[--color-text-secondary]">
                ({data.categories.map((row) => row.score).join(' + ')}) ÷ {data.categories.length} = {formatAverage(data.exactAverage)}
                {formatAverage(data.exactAverage) !== String(data.overall) && `, shown as ${data.overall}%`}
              </p>
              {data.hasUnresolvedCritical && (
                <p className="m-0 text-[--color-text-primary]">
                  Still not ready: a handoff can’t be ready while a critical gap is open, whatever the score.
                </p>
              )}
              <p className="m-0 text-[--color-text-muted]">Formula v{data.version} · the same gaps always give the same score</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
