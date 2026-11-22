'use client';

import { useActionState } from 'react';

import { startAnalysis } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import type { ActionResult } from '@/lib/types';

const initialState: ActionResult<{ analysisRunId: string }> | null = null;

type StartAnalysisButtonProps = {
  handoffId: string;
  /** Full-width inside the draft Analysis card (Figma). */
  isFullWidth?: boolean;
  disabled?: boolean;
  /** "Try again" / "Run analysis again" after a run that didn't finish. */
  label?: string;
  variant?: 'primary' | 'secondary';
};

export function StartAnalysisButton({
  handoffId,
  isFullWidth = false,
  disabled = false,
  label = 'Start analysis',
  variant = 'primary',
}: StartAnalysisButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: typeof initialState) => startAnalysis(handoffId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant={variant} disabled={isPending || disabled} className={isFullWidth ? 'w-full' : 'self-start'}>
        {isPending ? 'Starting…' : label}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-2 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}
    </form>
  );
}
