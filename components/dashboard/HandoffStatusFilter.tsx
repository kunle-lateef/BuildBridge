'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
};

/**
 * Filter/sort state lives in the URL, not client state, so the dashboard
 * stays server-rendered per architecture.md's "data fetching happens on the
 * server" rule — this component only ever navigates, it never fetches.
 */
export function HandoffStatusFilter({ currentStatus, currentSort }: HandoffStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === 'All' || value === 'updated') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex gap-3">
      <label className="flex items-center gap-1.5 text-[--color-text-secondary]">
        Status
        <select
          value={currentStatus}
          onChange={(event) => updateParam('status', event.target.value)}
          className="rounded-[--radius-sm] border border-[--color-border] bg-[--color-background] px-2 py-1 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-[--color-text-secondary]">
        Sort
        <select
          value={currentSort}
          onChange={(event) => updateParam('sort', event.target.value)}
          className="rounded-[--radius-sm] border border-[--color-border] bg-[--color-background] px-2 py-1 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
