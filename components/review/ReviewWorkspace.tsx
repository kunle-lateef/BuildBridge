'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useCallback, useState, type ComponentProps, type ReactNode } from 'react';

import { GuidedReview, type GuidedItem } from '@/components/review/GuidedReview';
import { ReviewCanvas } from '@/components/review/ReviewCanvas';

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
};

/**
 * The Review tab's two columns. In guided review the Findings panel is
 * swapped for the guided panel, and the canvas follows the finding being
 * reviewed: it switches to that screen and dims every other pin.
 */
export function ReviewWorkspace({ handoffId, screens, panel, isGuided, guidedItems, isBlocked, shareButton }: ReviewWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [focus, setFocus] = useState<GuidedItem['pin']>(null);

  const exit = useCallback(() => {
    setFocus(null);
    router.push(pathname);
  }, [pathname, router]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
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
        />
      ) : (
        <Fragment key="panel">{panel}</Fragment>
      )}
    </div>
  );
}
