'use client';

import { useEffect, useState } from 'react';

type ShareVisitState = { readinessScore: number | null; issueCount: number };

type WhatsChangedBannerProps = {
  shareToken: string;
  current: ShareVisitState;
};

/**
 * A coarse, per-browser "what changed since your last visit" comparison —
 * readiness score and open-issue count only, never a full diff. Uses
 * localStorage rather than a cookie: the comparison is entirely client-side
 * (the server already computed `current` for this render), so there's no
 * need to route through middleware or work around Server Components not
 * being able to set cookies. Same accepted limitation either mechanism
 * would have: per-browser, resets if storage is cleared or on a different
 * device — this boundary has no session to track a visitor across either.
 */
export function WhatsChangedBanner({ shareToken, current }: WhatsChangedBannerProps) {
  const [previous, setPrevious] = useState<ShareVisitState | null>(null);

  useEffect(() => {
    const storageKey = `bb-share-seen:${shareToken}`;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setPrevious(JSON.parse(raw) as ShareVisitState);
      }
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      // localStorage unavailable (private browsing, disabled) — the banner
      // simply never appears; nothing else in this view depends on it.
    }
    // Only ever run once per mount — this reads "last visit," not "last render."
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!previous) return null;
  if (previous.readinessScore === current.readinessScore && previous.issueCount === current.issueCount) return null;

  return (
    <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-4 py-3">
      <p className="font-medium text-[--color-text-primary]">Updated since your last visit</p>
      <ul className="mt-1 flex flex-col gap-0.5 text-[--color-text-secondary]">
        {previous.readinessScore !== current.readinessScore && (
          <li>
            Readiness: {previous.readinessScore ?? '—'}% → {current.readinessScore ?? '—'}%
          </li>
        )}
        {previous.issueCount !== current.issueCount && (
          <li>
            {current.issueCount} open item{current.issueCount === 1 ? '' : 's'} (was {previous.issueCount})
          </li>
        )}
      </ul>
    </div>
  );
}
