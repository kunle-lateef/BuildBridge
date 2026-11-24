'use client';

import { useEffect, useState } from 'react';

import { AssistantDrawer } from '@/components/review/AssistantDrawer';
import { onOpenInDrawer, openAssistant, type AskAbout } from '@/components/review/assistantEvents';
import { Sparkles } from '@/components/ui/icons';

type AskBuildBridgeFabProps = {
  handoffId: string;
  handoffName: string;
  /** 'text' is the Review header's borderless button (Figma); 'fab' the floating one. */
  variant?: 'fab' | 'text';
};

/**
 * Opens Ask BuildBridge. On the Review tab the findings panel takes it, in
 * place of the findings (Figma `04 — Handoff / Assistant`); on any other
 * tab there's no findings panel, so this drawer opens instead.
 */
export function AskBuildBridgeFab({ handoffId, handoffName, variant = 'fab' }: AskBuildBridgeFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [about, setAbout] = useState<AskAbout | null>(null);

  useEffect(
    () =>
      onOpenInDrawer((next) => {
        setAbout(next);
        setIsOpen(true);
      }),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => openAssistant(null)}
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
        handoffName={handoffName}
        about={about}
        onClearAbout={() => setAbout(null)}
      />
    </>
  );
}
