'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  FLAG_SENT_EVENT,
  loadTrackedFlags,
  type FlagStatus,
  type TrackedFlag,
} from '@/components/handoff/DeveloperFlagForm';
import { cn } from '@/lib/cn';

/** At most this many recent flags are listed (each one is a status request). */
const MAX_LISTED = 5;

const STATUS_STYLE: Record<string, string> = {
  Open: 'bg-[--color-warning-light] text-[--color-warning]',
  Acknowledged: 'bg-[--color-info-light] text-[--color-info]',
  Resolved: 'bg-[--color-success-light] text-[--color-success]',
};

type Row = TrackedFlag & { status: string | null; isUpdate: boolean };

function seenKey(shareToken: string): string {
  return `bb-my-flags-seen:${shareToken}`;
}

function loadSeen(shareToken: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(seenKey(shareToken));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * "Your flags" under the share view's nav (Figma `05 — Share view` →
 * Desktop 1440, Flag sent, Flag answered). Lists the flags this browser
 * sent, with their status from the public tracking route. A status that
 * changed since this browser last looked counts as an update and is
 * outlined until the next visit.
 */
export function YourFlags({ shareToken }: { shareToken: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  const refresh = useCallback(async () => {
    const flags = loadTrackedFlags(shareToken).slice(-MAX_LISTED).reverse();
    if (flags.length === 0) {
      setRows([]);
      return;
    }
    setRows((prev) => flags.map((flag) => prev.find((row) => row.id === flag.id) ?? { ...flag, status: null, isUpdate: false }));

    const statuses = await Promise.all(
      flags.map(async (flag) => {
        try {
          const response = await fetch(`/api/share/${shareToken}/flags/track/${flag.trackingToken}`);
          const result: { ok: boolean; data?: FlagStatus } = await response.json();
          return result.ok && result.data ? result.data.status : null;
        } catch {
          return null;
        }
      }),
    );

    const seen = loadSeen(shareToken);
    const next = flags.map((flag, index) => {
      const status = statuses[index] ?? null;
      const before = seen[flag.id];
      return { ...flag, status, isUpdate: Boolean(status && before && before !== status) };
    });
    setRows((prev) =>
      // An update stays outlined for the rest of this visit.
      next.map((row) => ({ ...row, isUpdate: row.isUpdate || Boolean(prev.find((old) => old.id === row.id)?.isUpdate) })),
    );

    try {
      for (const row of next) if (row.status) seen[row.id] = row.status;
      localStorage.setItem(seenKey(shareToken), JSON.stringify(seen));
    } catch {
      // Without storage there's nothing to compare against next time.
    }
  }, [shareToken]);

  useEffect(() => {
    void refresh();
    const onSent = () => void refresh();
    window.addEventListener(FLAG_SENT_EVENT, onSent);
    return () => window.removeEventListener(FLAG_SENT_EVENT, onSent);
  }, [refresh]);

  if (rows.length === 0) return null;
  const updateCount = rows.filter((row) => row.isUpdate).length;

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-[--color-border] pt-4">
      <span className="flex items-center gap-2 text-[12px] leading-4 tracking-[0.2px]">
        <span className="font-medium text-[--color-text-secondary]">Your flags</span>
        {updateCount > 0 && (
          <>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[--color-primary]" />
            <span className="text-[--color-primary]">
              {updateCount} {updateCount === 1 ? 'update' : 'updates'}
            </span>
          </>
        )}
      </span>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              'flex flex-col items-start gap-1 rounded-[8px] border bg-white px-3 py-2',
              row.isUpdate ? 'border-[--color-primary]' : 'border-[--color-border]',
            )}
          >
            <span className="w-full break-words text-[14px] leading-5 text-[--color-text-body]">{row.message}</span>
            {row.status && (
              <span
                className={cn(
                  'rounded-[4px] px-2 py-0.5 text-[12px] font-medium leading-4 tracking-[0.2px]',
                  STATUS_STYLE[row.status] ?? 'bg-[--color-surface] text-[--color-text-secondary]',
                )}
              >
                {row.status}
              </span>
            )}
            {row.status === 'Resolved' && (
              <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-body]">
                The designer marked this resolved. Check the handoff for what changed.
              </span>
            )}
          </li>
        ))}
      </ul>
      <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
        Your flags are saved in this browser.
      </span>
    </div>
  );
}
