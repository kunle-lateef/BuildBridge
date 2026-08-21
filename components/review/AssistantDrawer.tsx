'use client';

import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AssistantPanel } from '@/components/review/AssistantPanel';
import { cn } from '@/lib/cn';

type AssistantDrawerProps = {
  open: boolean;
  onClose: () => void;
  handoffId: string;
};

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A right-anchored, full-height sliding panel — replaces the centered
 * Modal that used to host the assistant. A chat is an ongoing, resumable
 * task rather than a one-shot confirmation, so it reads better as a
 * workspace pinned to the edge of the screen than as a dialog interrupting
 * the middle of it. Full-width below `sm` (there's no room to spare on a
 * phone), a fixed 440px panel above it (full-width on desktop would make
 * every chat line span the whole monitor, and would hide all page context).
 *
 * Panel-sliding mechanics (fixed + translate-x + always-mounted so both the
 * open AND close transitions animate) match Sidebar.tsx's off-canvas drawer
 * exactly. Focus-trap/Escape/restore-focus mechanics match Modal.tsx exactly
 * — this is deliberately "Modal's a11y behavior wearing Sidebar's visual
 * shape" rather than a third, novel pattern.
 */
export function AssistantDrawer({ open, onClose, handoffId }: AssistantDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // The panel stays mounted even while closed so the close transition can
  // animate (see the class note below) — but createPortal(..., document.body)
  // can't run during SSR, where `document` doesn't exist. Deferring the
  // portal to after mount is the standard fix, same tradeoff Modal.tsx
  // avoids differently (it unmounts entirely via `if (!open) return null`,
  // which this component can't do without losing the close animation).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={onClose} />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ask BuildBridge"
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-[--color-border] bg-[--color-background] shadow-lg transition-transform duration-300 ease-out focus:outline-none sm:w-[440px]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[--color-border] p-4">
          <h2 className="flex items-center gap-2 text-[--color-text-primary]">
            <Sparkles aria-hidden="true" size={18} className="text-[--color-ai-suggested]" />
            Ask BuildBridge
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[--radius-sm] p-1.5 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        {/* No padding here — AssistantPanel now owns its own internal
            padding so its footer row can span edge-to-edge independently
            of its scrollable message area. */}
        <div className="min-h-0 flex-1">
          <AssistantPanel handoffId={handoffId} className="h-full border-0 p-0" />
        </div>
      </div>
    </>,
    document.body,
  );
}
