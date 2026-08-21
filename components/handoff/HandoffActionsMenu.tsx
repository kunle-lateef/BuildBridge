'use client';

import { MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ArchiveHandoffButton } from '@/components/handoff/ArchiveHandoffButton';
import { DeleteHandoffButton } from '@/components/handoff/DeleteHandoffButton';
import { DuplicateHandoffButton } from '@/components/handoff/DuplicateHandoffButton';
import { Button } from '@/components/ui/Button';

type HandoffActionsMenuProps = {
  handoffId: string;
  isArchived: boolean;
};

/**
 * Archive/Duplicate/Delete used to sit as three permanently-visible
 * secondary buttons next to the title — same "wall of buttons" clutter the
 * handoff list's Archive button had before it went hover-only. Here there's
 * no row to hover, so the fix is a menu instead: same outside-click-to-close
 * pattern as Sidebar's account menu.
 */
export function HandoffActionsMenu({ handoffId, isArchived }: HandoffActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="More actions"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <MoreHorizontal aria-hidden="true" size={16} />
      </Button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1.5 flex w-max flex-col gap-1.5 rounded-[--radius-md] border border-[--color-border] bg-[--color-background] p-2 shadow-lg"
        >
          <DuplicateHandoffButton handoffId={handoffId} />
          <ArchiveHandoffButton handoffId={handoffId} isArchived={isArchived} />
          <DeleteHandoffButton handoffId={handoffId} />
        </div>
      )}
    </div>
  );
}
