'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  archiveHandoff,
  unarchiveHandoff,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';

type ArchiveHandoffButtonProps = {
  handoffId: string;
  isArchived: boolean;
};

export function ArchiveHandoffButton({ handoffId, isArchived }: ArchiveHandoffButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setError(null);

    const result = isArchived ? await unarchiveHandoff(handoffId) : await archiveHandoff(handoffId);

    setIsPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => void handleClick()}
        className="self-start rounded-[--radius-md] border border-[--color-border] px-3 py-1.5 text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-50"
      >
        {isPending ? '…' : isArchived ? 'Unarchive' : 'Archive'}
      </button>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
