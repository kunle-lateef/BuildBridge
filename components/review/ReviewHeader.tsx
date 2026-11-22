import Link from 'next/link';
import type { ReactNode } from 'react';

import { ReadinessBreakdown, type BreakdownData } from '@/components/review/ReadinessBreakdown';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { cn } from '@/lib/cn';
import type { HandoffStatus } from '@/lib/types';

type ReviewHeaderProps = {
  name: string;
  status: HandoffStatus;
  /** Null until the first analysis finishes. */
  readinessScore: number | null;
  criticalOpenCount: number;
  reviewedCount: number;
  findingCount: number;
  /** Share, Ask BuildBridge and the ⋯ menu, in Figma's order. */
  actions: ReactNode;
  /** Replaces the readiness line, e.g. while analysis runs or before it starts. */
  statusLine?: ReactNode;
  /** The working behind the score; when given, the readiness line opens it. */
  breakdown?: BreakdownData;
};

/**
 * The Review page's header band (Figma `04 — Handoff` → "Review — Desktop
 * 1440"): breadcrumb, title and status, the state line that leads with
 * whether the handoff can be shared, and the actions.
 *
 * "Not ready" follows readiness formula v1: an open critical gap blocks
 * sharing (share-link-actions.ts refuses), whatever the score.
 */
export function ReviewHeader({
  name,
  status,
  readinessScore,
  criticalOpenCount,
  reviewedCount,
  findingCount,
  actions,
  statusLine,
  breakdown,
}: ReviewHeaderProps) {
  const isReady = readinessScore !== null && criticalOpenCount === 0;

  return (
    <header className="flex flex-col gap-2">
      <nav aria-label="Breadcrumb" className="text-[12px] leading-4 text-[--color-text-secondary]">
        <Link href="/handoffs" className="text-[--color-primary] hover:underline">
          Handoffs
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{name}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">{name}</h1>
            <HandoffStatusBadge status={status} />
          </div>

          {statusLine}
          {!statusLine && readinessScore !== null && (
            <div className="flex flex-col gap-1.5">
              <p className="m-0 flex flex-wrap gap-x-2 text-[14px] leading-5">
                {isReady ? (
                  <span className="font-semibold text-[--color-text-primary]">Ready to share</span>
                ) : (
                  <>
                    <span className="font-semibold text-[--color-text-primary]">Not ready</span>
                    <span className="text-[--color-error]">
                      {criticalOpenCount} critical {criticalOpenCount === 1 ? 'gap blocks' : 'gaps block'} sharing
                    </span>
                  </>
                )}
              </p>
              {(() => {
                const line = (
                  <span className="flex items-center gap-3 text-[12px] leading-4 text-[--color-text-secondary]">
                    <span
                      className="relative block h-1 w-[72px] rounded-full bg-[--color-surface]"
                      role="meter"
                      aria-label="Readiness"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={readinessScore}
                    >
                      <span
                        className={cn('block h-full rounded-full', isReady ? 'bg-[--color-success]' : 'bg-[--color-warning]')}
                        style={{ width: `${readinessScore}%` }}
                      />
                      {!isReady && (
                        <span
                          aria-hidden="true"
                          className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-[--color-error]"
                          style={{ left: `${readinessScore}%` }}
                        />
                      )}
                    </span>
                    <span>
                      <span className={breakdown ? 'underline decoration-dotted underline-offset-2' : undefined}>
                        {readinessScore}% readiness
                      </span>{' '}
                      · {reviewedCount} of {findingCount} reviewed
                    </span>
                  </span>
                );
                return breakdown ? <ReadinessBreakdown data={breakdown}>{line}</ReadinessBreakdown> : line;
              })()}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}

export type ReviewTab = 'review' | 'screens' | 'responsive' | 'feedback' | 'history' | 'notes';

/** The Review page's tabs. Each is a link, so the tab lives in the URL. */
export function ReviewTabs({
  handoffId,
  current,
  tabs,
}: {
  handoffId: string;
  current: ReviewTab;
  tabs: { key: ReviewTab; label: string; count?: number }[];
}) {
  return (
    <nav aria-label="Handoff sections" className="-mb-px flex gap-6 overflow-x-auto border-b border-[--color-border]">
      {tabs.map((tab) => {
        const isActive = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.key === 'review' ? `/handoffs/${handoffId}` : `/handoffs/${handoffId}?tab=${tab.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-baseline gap-1.5 whitespace-nowrap pb-3 text-[14px] leading-5',
              isActive
                ? 'border-b-2 border-[--color-primary] font-medium text-[--color-text-primary]'
                : 'text-[--color-text-secondary] hover:text-[--color-text-primary]',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-[12px] font-normal leading-4 text-[--color-text-secondary]">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
