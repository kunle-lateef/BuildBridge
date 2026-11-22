'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { deleteDraftScreen, reorderDraftScreens } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { X } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';

export type DraftScreen = {
  id: string;
  name: string;
  imageUrl: string;
  /** "1440 × 1024 · 2.1MB" */
  meta: string;
};

/**
 * The screen list on a Draft handoff (Figma `04 — Handoff` → "Draft —
 * Ready to analyze"): numbered rows with a thumbnail, drag to reorder, and
 * × to remove. Alt+↑/↓ on a row's handle moves it from the keyboard.
 */
export function DraftScreenList({ handoffId, screens }: { handoffId: string; screens: DraftScreen[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState(screens);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => setOrder(screens), [screens]);

  async function save(next: DraftScreen[]) {
    setOrder(next);
    const result = await reorderDraftScreens(handoffId, next.map((screen) => screen.id));
    if (!result.ok) {
      toast(result.error.message, 'error');
      setOrder(screens);
      return;
    }
    router.refresh();
  }

  function move(id: string, to: number) {
    const from = order.findIndex((screen) => screen.id === id);
    if (from < 0 || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    void save(next);
  }

  async function remove(id: string) {
    const result = await deleteDraftScreen(id);
    if (!result.ok) {
      toast(result.error.message, 'error');
      return;
    }
    setOrder((current) => current.filter((screen) => screen.id !== id));
    router.refresh();
  }

  if (order.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <ol className="m-0 list-none overflow-hidden rounded-[12px] border border-[--color-border] bg-white p-0">
        {order.map((screen, index) => (
          <li
            key={screen.id}
            draggable
            onDragStart={() => setDragId(screen.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragId) move(dragId, index);
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5',
              index < order.length - 1 && 'border-b border-[--color-border]',
              dragId === screen.id && 'opacity-50',
            )}
          >
            <button
              type="button"
              aria-label={`Move ${screen.name}. Use Alt and the arrow keys.`}
              onKeyDown={(event) => {
                if (!event.altKey) return;
                if (event.key === 'ArrowUp') move(screen.id, index - 1);
                if (event.key === 'ArrowDown') move(screen.id, index + 1);
              }}
              className="cursor-grab px-1 text-[--color-text-dismissed]"
            >
              <span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
                {Array.from({ length: 6 }, (_, dot) => (
                  <span key={dot} className="h-[3px] w-[3px] rounded-full bg-current" />
                ))}
              </span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable */}
            <img src={screen.imageUrl} alt="" className="h-8 w-[52px] shrink-0 rounded-[4px] border border-[--color-border] object-cover object-top" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] leading-5 text-[--color-text-primary]">
                <span className="mr-1.5 text-[12px] text-[--color-text-secondary]">{index + 1}.</span>
                {screen.name}
              </span>
              <span className="text-[12px] leading-4 text-[--color-text-secondary]">{screen.meta}</span>
            </span>
            <button
              type="button"
              aria-label={`Remove ${screen.name}`}
              onClick={() => void remove(screen.id)}
              className="grid h-7 w-7 place-items-center rounded-[6px] text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary]"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </li>
        ))}
      </ol>
      <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
        Drag to reorder. The order becomes the screen flow developers see.
      </p>
    </div>
  );
}
