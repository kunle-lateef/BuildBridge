'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import type { ActionResult } from '@/lib/types';

type DeleteAccountButtonProps = {
  action: () => Promise<ActionResult<{ deleted: true }>>;
  activeHandoffs: number;
  archivedHandoffs: number;
  activeShareLinks: number;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The one action in the product with no undo and no scope limit. Figma
 * `06 — Settings / Delete account (confirm)` makes the cost concrete instead
 * of asking for a typed phrase: the dialog lists exactly what goes (how
 * many handoffs, how many live share links developers will lose), and the
 * safe choice, "Keep my account", comes first and takes focus.
 */
export function DeleteAccountButton({ action, activeHandoffs, archivedHandoffs, activeShareLinks }: DeleteAccountButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    const result = await action();

    if (!result.ok) {
      setIsPending(false);
      setError(result.error.message);
    }
    // On success, action() itself signs out with a redirect — no further
    // client-side handling needed, this component unmounts via navigation.
  }

  const losses = [
    activeHandoffs > 0 && archivedHandoffs > 0 && `${activeHandoffs} active and ${archivedHandoffs} archived handoffs`,
    activeHandoffs > 0 && archivedHandoffs === 0 && plural(activeHandoffs, 'active handoff'),
    activeHandoffs === 0 && archivedHandoffs > 0 && plural(archivedHandoffs, 'archived handoff'),
    activeShareLinks > 0 && `${plural(activeShareLinks, 'active share link')}`,
  ].filter(Boolean) as string[];

  return (
    <>
      <Button type="button" variant="dangerOutline" onClick={() => setIsOpen(true)} className="self-start">
        Delete account
      </Button>

      <Modal
        open={isOpen}
        onClose={() => !isPending && setIsOpen(false)}
        title="Delete your account?"
        description="This permanently deletes your account and every handoff you own: screens, analysis, notes and share links. Developers with a share link lose access right away. This can’t be undone."
      >
        <div className="flex flex-col gap-6">
          {losses.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-1 rounded-[8px] bg-[--color-error-light] px-3 py-3 text-[14px] leading-5 text-[--color-error]">
              {losses.map((loss) => (
                <li key={loss}>• {loss}</li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="m-0 flex items-center gap-2 text-[14px] text-[--color-error]">
              <AlertCircle aria-hidden="true" size={14} />
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={isPending}>
              Keep my account
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleConfirm()} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
