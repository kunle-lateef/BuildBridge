'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteHandoff } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertCircle } from '@/components/ui/icons';

type DeleteHandoffButtonProps = {
  handoffId: string;
  /** The example's banner link: "Delete example", with wording for made-up data. */
  isExample?: boolean;
};

export function DeleteHandoffButton({ handoffId, isExample = false }: DeleteHandoffButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deleteHandoff(handoffId);

    if (!result.ok) {
      setIsPending(false);
      setIsConfirmOpen(false);
      setError(result.error.message);
      return;
    }

    router.push('/handoffs');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {isExample ? (
        <button type="button" onClick={() => setIsConfirmOpen(true)} className="self-start text-[12px] leading-4 text-[--color-primary] underline">
          Delete example
        </button>
      ) : (
        <Button type="button" variant="danger" size="sm" onClick={() => setIsConfirmOpen(true)} className="self-start">
          Delete
        </Button>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        title={isExample ? 'Delete the example?' : 'Delete this handoff?'}
        description={
          isExample
            ? 'Your changes to the example are removed. You can still browse the read-only example at /example.'
            : 'This permanently deletes every screen, component, analysis, note, and share link on this handoff. This cannot be undone.'
        }
        confirmLabel={isExample ? 'Delete example' : 'Delete'}
        variant="danger"
        isConfirming={isPending}
      />
    </div>
  );
}
