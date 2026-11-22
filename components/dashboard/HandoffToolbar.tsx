'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { LayoutGrid, List, Search, X } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type HandoffTab = { label: string; status: string | null; count: number };

type HandoffToolbarProps = {
  tabs: HandoffTab[];
  currentStatus: string | null;
  currentSort: string;
  currentQuery: string;
  currentView: 'list' | 'grid';
};

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'readiness', label: 'Readiness' },
];

/**
 * The handoff list's toolbar (Figma `03 — Dashboard`): status tabs with
 * counts, a search button that opens an inline field, sort, and the
 * list/grid toggle. All state lives in the URL, so the page stays
 * server-rendered.
 */
export function HandoffToolbar({ tabs, currentStatus, currentSort, currentQuery, currentView }: HandoffToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(currentQuery));
  const [query, setQuery] = useState(currentQuery);

  function hrefWith(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-col gap-2 border-b border-[--color-border] px-4 pr-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Filter by status" className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.status === currentStatus;
          return (
            <Link
              key={tab.label}
              href={hrefWith({ status: tab.status })}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap pb-3 pt-4 text-[14px] leading-5',
                isActive
                  ? 'border-b-2 border-[--color-primary] font-medium text-[--color-text-primary]'
                  : 'text-[--color-text-secondary] hover:text-[--color-text-primary]',
              )}
            >
              {tab.label}
              <span className="text-[12px] font-normal leading-4 text-[--color-text-secondary]">{tab.count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 pb-2 sm:pb-0">
        {isSearchOpen ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              router.push(hrefWith({ q: query.trim() || null }));
            }}
            className="flex h-8 items-center gap-1 rounded-[8px] border border-[--color-border] pl-2 pr-1"
          >
            <Search aria-hidden="true" size={14} className="text-[--color-text-secondary]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              aria-label="Search handoffs"
              placeholder="Search handoffs"
              className="h-full w-36 border-0 bg-transparent text-[14px] leading-5 shadow-none outline-none focus:border-0 focus:shadow-none"
            />
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setIsSearchOpen(false);
                router.push(hrefWith({ q: null }));
              }}
              className="grid h-6 w-6 place-items-center rounded-[4px] text-[--color-text-secondary] hover:bg-[--color-surface]"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            aria-label="Search handoffs"
            onClick={() => setIsSearchOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-[8px] border border-[--color-border] text-[--color-text-secondary] hover:bg-[--color-background]"
          >
            <Search aria-hidden="true" size={16} />
          </button>
        )}

        <label className="sr-only" htmlFor="handoff-sort">
          Sort
        </label>
        <select
          id="handoff-sort"
          value={currentSort}
          onChange={(event) => router.push(hrefWith({ sort: event.currentTarget.value === 'updated' ? null : event.currentTarget.value }))}
          className="h-[38px] rounded-[8px] border border-[--color-border] bg-white pl-3 pr-8 text-[14px] leading-5 text-[--color-text-body]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div role="group" aria-label="View" className="flex gap-0.5 rounded-[8px] border border-[--color-border] p-0.5">
          {(['list', 'grid'] as const).map((view) => (
            <Link
              key={view}
              href={hrefWith({ view: view === 'list' ? null : view })}
              aria-label={view === 'list' ? 'List view' : 'Grid view'}
              aria-current={currentView === view ? 'true' : undefined}
              className={cn(
                'grid h-6 w-[30px] place-items-center rounded-[6px]',
                currentView === view ? 'bg-[--color-surface] text-[--color-text-primary]' : 'text-[--color-text-secondary]',
              )}
            >
              {view === 'list' ? <List aria-hidden="true" size={14} /> : <LayoutGrid aria-hidden="true" size={14} />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
