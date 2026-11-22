'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { recordDesignerDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import type { FindingType } from '@/lib/types';

type DecisionControlsProps = {
  findingType: FindingType;
  findingReference: string;
  currentValue: string;
  className?: string;
};

type PendingAction = 'Modify' | 'Override' | null;

/**
 * Confirm / Modify / Reject / Override — the designer-authority controls
 * every AI-generated finding needs. See AGENTS.md's Non-Negotiable #3: a
 * decision recorded here is never silently overwritten by a later
 * AnalysisRun (enforced in lib/decisions.ts, not here).
 */
const ACTION_MESSAGE: Record<'Confirm' | 'Modify' | 'Reject' | 'Override', string> = {
  Confirm: 'Confirmed.',
  Modify: 'Modified.',
  Reject: 'Rejected.',
  Override: 'Overridden.',
};

export function DecisionControls({
  findingType,
  findingReference,
  currentValue,
  className,
}: DecisionControlsProps) {
  const router = useRouter();
  const { toast } = useToast();
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
    toast(ACTION_MESSAGE[action]);
    router.refresh();
  }

  if (pendingAction) {
    const valueError = editedValue.trim().length === 0 ? 'Value cannot be empty.' : undefined;

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Textarea
          id={`decision-${findingReference}`}
          label={`${pendingAction} value`}
          hideLabel
          value={editedValue}
          onChange={(event) => setEditedValue(event.target.value)}
          rows={2}
          autoFocus
          maxLength={2000}
          error={valueError}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || !!valueError}
            onClick={() => void submit(pendingAction, editedValue)}
          >
            {isSubmitting ? 'Saving…' : 'Save change'}
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Figma `04 — Handoff`: Confirm / Modify / Reject, 30px, with Confirm
          outlined in the done colour. Override is still a supported decision
          (recordDesignerDecision), it just isn't offered in this row. */}
      <div className="flex flex-wrap gap-2">
        {(['Confirm', 'Modify', 'Reject'] as const).map((action) => (
          <button
            key={action}
            type="button"
            disabled={isSubmitting}
            onClick={() => (action === 'Modify' ? setPendingAction('Modify') : void submit(action))}
            className={cn(
              'inline-flex h-[30px] items-center rounded-[8px] border bg-white px-3 text-[14px] font-medium leading-5 tracking-[0.1px] disabled:opacity-60',
              action === 'Confirm'
                ? 'border-[--color-success] text-[--color-success] hover:bg-[--color-success-light]'
                : 'border-[--color-border] text-[--color-text-body] hover:bg-[--color-surface]',
            )}
          >
            {action}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
