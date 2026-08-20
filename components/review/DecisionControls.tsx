'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { recordDesignerDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
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
            {isSubmitting ? 'Saving…' : `Save ${pendingAction.toLowerCase()}`}
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
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
      <div className="flex flex-wrap gap-2">
        {/* Tinted per action using the exact same token pairs
            ReviewStatusBadge already maps each outcome to (Confirmed=
            success, Rejected=dismissed, Modified=primary) — not a new
            color convention, just applying the existing one to the
            buttons that cause it. Override has no reviewStatus distinct
            from Modify (see applyDecisionToFinding), so it stays neutral. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void submit('Confirm')}
          className="border-[--color-success] text-[--color-success] hover:bg-[--color-success-light]"
        >
          Confirm
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => setPendingAction('Modify')}
          className="border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary-light]"
        >
          Modify
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void submit('Reject')}
          className="text-[--color-text-dismissed]"
        >
          Reject
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => setPendingAction('Override')}>
          Override
        </Button>
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
