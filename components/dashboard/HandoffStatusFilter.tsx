'use client';

import { LayoutGrid, List } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import type { HandoffStatus } from '@/lib/types';

const STATUS_OPTIONS: Array<HandoffStatus | 'All'> = [
  'All',
  'Draft',
  'Analyzing',
  'NeedsReview',
  'Ready',
  'Shared',
  'Archived',
];

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'readiness', label: 'Readiness' },
];

type HandoffStatusFilterProps = {
  currentStatus: string;
  currentSort: string;
  currentQuery: string;
  currentView: string;
};

/**
 * Filter/sort/search/view state all live in the URL, not client state, so
 * the dashboard stays server-rendered per architecture.md's "data fetching
 * happens on the server" rule — this component only ever navigates, it
 * never fetches. Search is debounced client-side before it touches the URL
 * so every keystroke doesn't trigger a navigation.
 */
export function HandoffStatusFilter({ currentStatus, currentSort, currentQuery, currentView }: HandoffStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(currentQuery);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === 'All' || value === 'updated' || value === 'list') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  useEffect(() => {
    if (searchDraft === currentQuery) return;

    const timeout = setTimeout(() => updateParam('q', searchDraft), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-full sm:w-auto">
        <Input
          id="handoff-search"
          label="Search"
          hideLabel
          placeholder="Search handoffs…"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      <div className="flex w-full gap-4 sm:w-auto">
        <label className="flex flex-1 flex-col gap-1.5 sm:flex-initial">
          <span className="text-[--color-text-body]">Status</span>
          <select
            value={currentStatus}
            onChange={(event) => updateParam('status', event.target.value)}
            className="h-10 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1.5 sm:flex-initial">
          <span className="text-[--color-text-body]">Sort</span>
          <select
            value={currentSort}
            onChange={(event) => updateParam('sort', event.target.value)}
            className="h-10 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1 rounded-[--radius-md] border border-[--color-border] p-1">
        <button
          type="button"
          aria-label="List view"
          aria-pressed={currentView !== 'grid'}
          onClick={() => updateParam('view', 'list')}
          className={cn(
            'rounded-[--radius-sm] p-1.5 text-[--color-text-secondary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
            currentView !== 'grid' && 'bg-[--color-surface] text-[--color-text-primary]',
          )}
        >
          <List aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Grid view"
          aria-pressed={currentView === 'grid'}
          onClick={() => updateParam('view', 'grid')}
          className={cn(
            'rounded-[--radius-sm] p-1.5 text-[--color-text-secondary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
            currentView === 'grid' && 'bg-[--color-surface] text-[--color-text-primary]',
          )}
        >
          <LayoutGrid aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  );
}
