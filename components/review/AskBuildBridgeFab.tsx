'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { AssistantDrawer } from '@/components/review/AssistantDrawer';

type AskBuildBridgeFabProps = {
  handoffId: string;
};

/**
 * Replaces the old bottom-of-page "Ask BuildBridge" section — on a handoff
 * with real content that section was the last of ~10 stacked sections,
 * reachable only after scrolling past everything else. A fixed trigger
 * keeps the assistant one click away regardless of scroll position.
 */
export function AskBuildBridgeFab({ handoffId }: AskBuildBridgeFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-[--color-primary] px-4 py-3 text-white shadow-lg transition-transform hover:scale-105 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2"
      >
        <Sparkles aria-hidden="true" size={18} />
        <span className="hidden sm:inline">Ask BuildBridge</span>
      </button>

      <AssistantDrawer open={isOpen} onClose={() => setIsOpen(false)} handoffId={handoffId} />
    </>
  );
}
