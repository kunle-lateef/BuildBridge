'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';

import { FindingsVisibilityContext } from '@/components/review/FindingsVisibility';
import { GuidedReview, type GuidedItem } from '@/components/review/GuidedReview';
import { ReviewCanvas } from '@/components/review/ReviewCanvas';
import { cn } from '@/lib/cn';

type ReviewWorkspaceProps = {
  handoffId: string;
  screens: ComponentProps<typeof ReviewCanvas>['screens'];
  /** The normal Findings panel. */
  panel: ReactNode;
  /** True when the URL asks for guided review (?guided=1, from "Review next"). */
  isGuided: boolean;
  guidedItems: GuidedItem[];
  isBlocked: boolean;
  shareButton: ReactNode;
  isExample?: boolean;
  /** Shown on the collapsed findings rail ("26 to review"). */
  toReviewCount: number;
};

/** Per browser, like the other view preferences. */
const HIDDEN_KEY = 'bb-findings-hidden';

/**
 * The Review tab's two columns. In guided review the Findings panel is
 * swapped for the guided panel, and the canvas follows the finding being
 * reviewed: it switches to that screen and dims every other pin.
 *
 * From `xl` up the panel can be hidden (Figma "Review — 1280 laptop,
 * findings hidden"): it shrinks to a 48px rail with « and the count to
 * review, and the canvas takes the width. The choice is remembered.
 */
export function ReviewWorkspace({
  handoffId,
  screens,
  panel,
  isGuided,
  guidedItems,
  isBlocked,
  shareButton,
  isExample = false,
  toReviewCount,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [focus, setFocus] = useState<GuidedItem['pin']>(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    try {
      setIsHidden(localStorage.getItem(HIDDEN_KEY) === '1');
    } catch {
      // No storage: the panel just starts shown.
    }
  }, []);

  const setHidden = useCallback((next: boolean) => {
    setIsHidden(next);
    try {
      if (next) localStorage.setItem(HIDDEN_KEY, '1');
      else localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Not remembered, still applied.
    }
  }, []);

  const visibility = useMemo(() => ({ hide: () => setHidden(true) }), [setHidden]);

  const exit = useCallback(() => {
    setFocus(null);
    router.push(pathname);
  }, [pathname, router]);

  // Guided review always shows its panel.
  const isCollapsed = isHidden && !isGuided;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        isCollapsed
          ? 'xl:grid-cols-[minmax(0,1fr)_48px]'
          : 'xl:grid-cols-[minmax(0,1fr)_404px] min-[1440px]:grid-cols-[minmax(0,1fr)_420px]',
      )}
    >
      <ReviewCanvas key="canvas" screens={screens} focus={isGuided ? focus : undefined} />
      {isGuided ? (
        <GuidedReview
          key="guided"
          handoffId={handoffId}
          items={guidedItems}
          isBlocked={isBlocked}
          onFocus={setFocus}
          onExit={exit}
          shareButton={shareButton}
          isExample={isExample}
        />
      ) : (
        <FindingsVisibilityContext.Provider key="panel" value={visibility}>
          {/* Below xl the panel stacks under the canvas, so it is never hidden there. */}
          <div className={isCollapsed ? 'contents xl:hidden' : 'contents'}>{panel}</div>
          {isCollapsed && (
            <div className="hidden flex-col items-center gap-3 rounded-[12px] border border-[--color-border] bg-white pt-3 xl:flex">
              <button
                type="button"
                onClick={() => setHidden(false)}
                aria-label="Show findings panel"
                title="Show findings"
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[--color-border] text-[14px] font-medium text-[--color-text-primary] hover:bg-[--color-surface]"
              >
                «
              </button>
              <span className="flex w-10 flex-col items-center gap-0.5 text-center">
                <span className="text-[14px] font-semibold text-[--color-text-primary]">{toReviewCount}</span>
                <span className="text-[11px] leading-[13px] text-[--color-text-secondary]">to review</span>
              </span>
            </div>
          )}
        </FindingsVisibilityContext.Provider>
      )}
    </div>
  );
}
