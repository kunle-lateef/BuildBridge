'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  archiveHandoff,
  unarchiveHandoff,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';

type ArchiveHandoffButtonProps = {
  handoffId: string;
  isArchived: boolean;
};

export function ArchiveHandoffButton({ handoffId, isArchived }: ArchiveHandoffButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleArchive() {
    setIsPending(true);
    setError(null);

    const result = await archiveHandoff(handoffId);

    setIsPending(false);
    setIsConfirmOpen(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast('Handoff archived.');
    router.refresh();
  }

  async function handleUnarchive() {
    setIsPending(true);
    setError(null);

    const result = await unarchiveHandoff(handoffId);

    setIsPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast('Handoff unarchived.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => (isArchived ? void handleUnarchive() : setIsConfirmOpen(true))}
        className="self-start"
      >
        {isPending ? '…' : isArchived ? 'Unarchive' : 'Archive'}
      </Button>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => void handleArchive()}
        title="Archive this handoff?"
        description="Archived handoffs are hidden from the main dashboard list but can be unarchived at any time."
        confirmLabel="Archive"
        isConfirming={isPending}
      />
    </div>
  );
}
