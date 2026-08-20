'use client';

import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { ActionResult } from '@/lib/types';

type DeleteAccountButtonProps = {
  action: () => Promise<ActionResult<{ deleted: true }>>;
};

const CONFIRM_PHRASE = 'DELETE';

/**
 * The one action in the product with no undo and no scope limit — deletes
 * every handoff the user owns, not just this session. A plain confirm
 * dialog (the pattern used for archive/revoke/sign-out-everywhere) isn't
 * enough friction here; this requires typing the confirm phrase before the
 * button even enables.
 */
export function DeleteAccountButton({ action }: DeleteAccountButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText === CONFIRM_PHRASE;

  async function handleConfirm() {
    if (!canConfirm) return;

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

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setIsOpen(true)} className="self-start">
        Delete account
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Delete your account?"
        description="This permanently deletes your account and every handoff you own — screens, analysis, notes, and share links included. This cannot be undone."
      >
        <div className="flex flex-col gap-4">
          <Input
            id="delete-account-confirm"
            label={`Type "${CONFIRM_PHRASE}" to confirm`}
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            disabled={isPending}
          />
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
              <AlertCircle aria-hidden="true" size={14} />
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm || isPending}
            >
              {isPending ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
