'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteHandoff } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertCircle } from '@/components/ui/icons';

type DeleteHandoffButtonProps = {
  handoffId: string;
};

export function DeleteHandoffButton({ handoffId }: DeleteHandoffButtonProps) {
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
      <Button type="button" variant="danger" size="sm" onClick={() => setIsConfirmOpen(true)} className="self-start">
        Delete
      </Button>
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
        title="Delete this handoff?"
        description="This permanently deletes every screen, component, analysis, note, and share link on this handoff. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isConfirming={isPending}
      />
    </div>
  );
}
