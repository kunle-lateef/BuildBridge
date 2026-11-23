'use client';

import { useEffect, useState } from 'react';

import { AssistantDrawer } from '@/components/review/AssistantDrawer';
import { ASK_ABOUT_EVENT, type AskAbout } from '@/components/review/AssistantPanel';
import { Sparkles } from '@/components/ui/icons';

type AskBuildBridgeFabProps = {
  handoffId: string;
  /** 'text' is the Review header's borderless button (Figma); 'fab' the floating one. */
  variant?: 'fab' | 'text';
};

/**
 * Opens the handoff's assistant. Also opens it when a finding card's "Ask
 * about this finding" fires ASK_ABOUT_EVENT, so the assistant starts with
 * that finding and a few questions to try (Figma `04 — Handoff /
 * Assistant (from a finding)`).
 */
export function AskBuildBridgeFab({ handoffId, variant = 'fab' }: AskBuildBridgeFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [about, setAbout] = useState<AskAbout | null>(null);

  useEffect(() => {
    function onAsk(event: Event) {
      const detail = (event as CustomEvent<AskAbout>).detail;
      if (!detail?.label) return;
      setAbout(detail);
      setIsOpen(true);
    }
    window.addEventListener(ASK_ABOUT_EVENT, onAsk);
    return () => window.removeEventListener(ASK_ABOUT_EVENT, onAsk);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          variant === 'text'
            ? 'flex h-10 items-center gap-2 rounded-[--radius-md] px-3 text-[14px] font-semibold leading-5 text-[--color-text-body] hover:bg-[--color-surface]'
            : 'fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-[--color-primary] px-4 py-3 text-white shadow-lg transition-transform hover:scale-105 hover:opacity-90'
        }
      >
        <Sparkles aria-hidden="true" size={variant === 'text' ? 16 : 18} className={variant === 'text' ? 'text-[--color-primary]' : undefined} />
        <span className={variant === 'text' ? undefined : 'hidden sm:inline'}>Ask BuildBridge</span>
      </button>

      <AssistantDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        handoffId={handoffId}
        about={about}
        onClearAbout={() => setAbout(null)}
      />
    </>
  );
}
