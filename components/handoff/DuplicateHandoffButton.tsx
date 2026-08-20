'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { duplicateHandoff } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';

type DuplicateHandoffButtonProps = {
  handoffId: string;
};

/**
 * Duplicates this handoff's component/spec/state skeleton into a new Draft
 * handoff — see duplicateHandoff's own doc comment for exactly what does
 * and doesn't carry over. No confirmation dialog: unlike Archive/Delete,
 * this only ever adds a new handoff, never touches the existing one.
 */
export function DuplicateHandoffButton({ handoffId }: DuplicateHandoffButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setIsPending(true);
    setError(null);

    const result = await duplicateHandoff(handoffId);

    setIsPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.push(`/handoffs/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => void handleDuplicate()}
        className="self-start"
      >
        {isPending ? 'Duplicating…' : 'Duplicate'}
      </Button>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
