'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { recordDesignerDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { cn } from '@/lib/cn';
import type { FindingType } from '@/lib/types';

type DecisionControlsProps = {
  findingType: FindingType;
  findingReference: string;
  currentValue: string;
  className?: string;
};

type PendingAction = 'Modify' | 'Override' | null;

const buttonClassName =
  'rounded-[--radius-sm] border border-[--color-border] px-2 py-1 text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-50';

/**
 * Confirm / Modify / Reject / Override — the designer-authority controls
 * every AI-generated finding needs. See AGENTS.md's Non-Negotiable #3: a
 * decision recorded here is never silently overwritten by a later
 * AnalysisRun (enforced in lib/decisions.ts, not here).
 */
export function DecisionControls({
  findingType,
  findingReference,
  currentValue,
  className,
}: DecisionControlsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [editedValue, setEditedValue] = useState(currentValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: 'Confirm' | 'Modify' | 'Reject' | 'Override', newValue?: string) {
    setIsSubmitting(true);
    setError(null);

    const result = await recordDesignerDecision({ findingType, findingReference, action, newValue });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setPendingAction(null);
    router.refresh();
  }

  if (pendingAction) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <textarea
          value={editedValue}
          onChange={(event) => setEditedValue(event.target.value)}
          rows={2}
          autoFocus
          className="rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-2 py-1.5 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void submit(pendingAction, editedValue)}
            className={cn(buttonClassName, 'bg-[--color-primary] text-white hover:opacity-90')}
          >
            {isSubmitting ? 'Saving…' : `Save ${pendingAction.toLowerCase()}`}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setPendingAction(null)}
            className={buttonClassName}
          >
            Cancel
          </button>
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submit('Confirm')}
          className={buttonClassName}
        >
          Confirm
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingAction('Modify')}
          className={buttonClassName}
        >
          Modify
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submit('Reject')}
          className={buttonClassName}
        >
          Reject
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingAction('Override')}
          className={buttonClassName}
        >
          Override
        </button>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
